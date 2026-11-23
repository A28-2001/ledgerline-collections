"""Customer matcher: link the same customer across systems that spell names differently.

Order: exact id -> exact name (after cleaning) -> fuzzy name -> AI judges (borderline only).
Every match keeps its method and a 0..1 score. Weak or disputed matches are not used
to make a decision; they are flagged for a person.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from rapidfuzz import fuzz, process

LEGAL = r"\b(incorporated|inc|llc|l l c|ltd|limited|co|company|corp|corporation|grp|plc|gmbh|the)\b"


def clean(name: str | None) -> str:
    if not name:
        return ""
    s = str(name).lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\bl\s+l\s+c\b", " ", s)
    s = re.sub(LEGAL, " ", s)
    return re.sub(r"\s+", " ", s).strip()


@dataclass
class Match:
    customer_id: str | None
    method: str  # exact_id | exact_name | fuzzy | ai | unmatched
    score: float
    candidate: str | None = None  # best guess when unmatched
    note: str = ""

    @property
    def ok(self) -> bool:
        return self.customer_id is not None


class Matcher:
    def __init__(self, customers, cfg: dict, ai=None):
        self.cfg = cfg["matching"]
        self.ai = ai
        self.by_id = {str(r.id).strip(): r.name for r in customers.itertuples() if r.id}
        self.clean_to_id: dict[str, str] = {}
        for cid, name in self.by_id.items():
            self.clean_to_id.setdefault(clean(name), cid)
        self.choices = list(self.clean_to_id)
        self.cache: dict[str, Match] = {}
        self.log: list[tuple[str, str, Match]] = []  # (system, raw name, match)

    def match(self, name: str | None, system: str, customer_id: str | None = None) -> Match:
        if customer_id and str(customer_id).strip() in self.by_id:
            m = Match(str(customer_id).strip(), "exact_id", 1.0)
        else:
            key = clean(name)
            if key in self.cache:
                m = self.cache[key]
            else:
                m = self._match_name(name, key)
                self.cache[key] = m
        self.log.append((system, str(name or customer_id or ""), m))
        return m

    def _match_name(self, raw: str | None, key: str) -> Match:
        if not key:
            return Match(None, "unmatched", 0.0, note="no name")
        if key in self.clean_to_id:
            return Match(self.clean_to_id[key], "exact_name", 1.0)
        # Bank statements cut names short: allow a prefix match on a long enough string.
        if len(key) >= 12:
            starts = [c for c in self.choices if c.startswith(key)]
            if len(starts) == 1:
                return Match(self.clean_to_id[starts[0]], "fuzzy", 0.95, note="name cut short")
        best = process.extract(key, self.choices, scorer=fuzz.token_sort_ratio, limit=2)
        if not best:
            return Match(None, "unmatched", 0.0)
        (c1, s1, _), *rest = best
        s2 = rest[0][1] if rest else 0
        partial = fuzz.partial_ratio(key, c1)
        score = max(s1, (s1 + partial) / 2)
        cid = self.clean_to_id[c1]
        if score >= self.cfg["fuzzy_high"] and s1 - s2 >= self.cfg["min_gap"]:
            return Match(cid, "fuzzy", round(score / 100, 3))
        if score >= self.cfg["fuzzy_low"]:
            if self.ai and self.ai.enabled:
                v = self.ai.same_company(str(raw), self.by_id[cid])
                if v["agree"] and v["answer"] == "yes":
                    return Match(cid, "ai", round(score / 100, 3), note="AI judges agreed")
                return Match(None, "unmatched", round(score / 100, 3), candidate=cid,
                             note="AI judges disagreed or said no: a person confirms")
            return Match(None, "unmatched", round(score / 100, 3), candidate=cid,
                         note="borderline name match: a person confirms")
        return Match(None, "unmatched", round(score / 100, 3), candidate=cid)

    def stats(self) -> dict:
        """Match rate over distinct (system, name) pairs."""
        seen: dict[tuple[str, str], Match] = {}
        for system, raw, m in self.log:
            seen[(system, raw)] = m
        total = len(seen)
        by_method: dict[str, int] = {}
        for m in seen.values():
            by_method[m.method] = by_method.get(m.method, 0) + 1
        matched = sum(1 for m in seen.values() if m.ok)
        per_system: dict[str, list[int]] = {}
        for (system, _), m in seen.items():
            per_system.setdefault(system, [0, 0])
            per_system[system][0] += int(m.ok)
            per_system[system][1] += 1
        return {"total": total, "matched": matched, "rate": matched / total if total else 0.0,
                "by_method": by_method, "per_system": per_system}
