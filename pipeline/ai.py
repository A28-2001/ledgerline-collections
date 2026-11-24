"""The one place the pipeline talks to an AI model.

- Swappable: only `_call` knows about Groq. Change it to use another provider.
- Agreement check (from Yardstick): every judgment is made by two judges with different
  model families and prompt wording. If they disagree, the case goes to a person.
- Cached: answers are saved in data/cache/ai_cache.json, so re-runs are free and repeatable.
- Optional: with no GROQ_API_KEY (or AI_OFF=1) the pipeline runs on rules only and says so.
The key is read from the environment and never printed or saved.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache" / "ai_cache.json"

TICKET_LABELS = ["billing_complaint", "serious_escalation", "other_complaint", "not_a_complaint"]

PROMPT_A = """You help a finance team at a billing-software company decide whether to send a payment reminder.
Read this support ticket from a customer and answer with exactly one label:
- billing_complaint: the customer disputes or questions what WE charged THEM for our software: their subscription invoice, price, seats, plan, renewal, discount, fees, refund or credit (even in vague words). Questions about using billing features for their own clients are NOT billing complaints
- serious_escalation: the customer is blocked, angry about outages, or threatening to leave
- other_complaint: the customer reports a problem that is not about money
- not_a_complaint: a question, request or feedback
Ticket subject: {subject}
Ticket text: {body}
Label:"""

PROMPT_B = """Classify the customer's message for a collections team. Reply with one of:
billing_complaint, serious_escalation, other_complaint, not_a_complaint.
Context: we sell billing software, so customers often mention invoices about THEIR clients; that is not a complaint about us.
Rules: anything questioning what they pay us (subscription, seats, plan, renewal, discount, fees) counts as billing_complaint.
Legal action, regulators, chargebacks, cancellation, data loss or whole-team outages count as serious_escalation.
Whole-team outages or churn threats count as serious_escalation.
Message: "{subject}. {body}"
Answer:"""

SAME_A = """Are these two names the same company? Answer yes or no.
Name 1: {a}
Name 2: {b}
Answer:"""

SAME_B = """A bank or accounting system wrote a customer name as "{a}". Our customer list has "{b}".
Is it the same business (ignore Inc/LLC, capitals, abbreviations and small typos)? Reply yes or no only."""


import re as _re


def redact(text: str) -> str:
    """Mask what sla_policy.md says tickets contain: card fragments, bank details, emails, phone numbers."""
    t = _re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "[email]", text)
    t = _re.sub(r"\b(?:\d[ -]?){13,19}\b", "[card]", t)
    t = _re.sub(r"\b(?:ending|last four|last 4)\D{0,10}\d{4}\b", "[card ending]", t, flags=_re.I)
    t = _re.sub(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b", "[iban]", t)
    t = _re.sub(r"\b\d{8,}\b", "[number]", t)
    t = _re.sub(r"\+?\d[\d ().-]{8,}\d", "[phone]", t)
    return t


class AI:
    def __init__(self, cfg: dict):
        self.models = cfg["ai"]["judges"]
        self.drafter = cfg["ai"]["drafter"]
        self.params = cfg["ai"].get("params") or {}
        self.max_tokens = int(cfg["ai"].get("max_tokens", 300))
        self.enabled = bool(os.environ.get("GROQ_API_KEY")) and os.environ.get("AI_OFF") != "1" \
            and str(cfg["ai"].get("ticket_text", "redacted")).lower() not in ("off", "false", "no")  # YAML reads a bare off as False
        self.cache: dict[str, str] = json.loads(CACHE.read_text()) if CACHE.exists() else {}
        self.calls = 0
        self.judgments = 0
        self.agreements = 0
        self._client = None
        self.error: str | None = None

    def check(self) -> None:
        """One cheap call before the run. If the key is rejected or Groq is unreachable,
        fall back to rules only (and say so) instead of failing halfway through."""
        if not self.enabled:
            return
        try:
            from groq import Groq
            self._client = Groq()
            available = {m.id for m in self._client.models.list().data}
            missing = [m for m in {*self.models, self.drafter} if m not in available]
            if missing:
                self.error = f"model(s) not available on this key: {', '.join(missing)}. Update ai: in config.yaml"
                self.enabled = False
        except Exception as e:  # never print the key; the class name is enough
            self.error = f"Groq unavailable ({type(e).__name__}): key rejected or no connection"
            self.enabled = False

    @property
    def mode(self) -> str:
        return "groq" if self.enabled else "rules_only"

    def _call(self, model: str, prompt: str, max_tokens: int = 8) -> str:
        if self._client is None:
            from groq import Groq  # imported here so rules-only runs need no key
            self._client = Groq()
        for attempt in range(4):
            try:
                r = self._client.chat.completions.create(
                    model=model, temperature=0, max_tokens=max(max_tokens, self.max_tokens),
                    messages=[{"role": "user", "content": prompt}], **self.params.get(model, {}),
                )
                self.calls += 1
                return (r.choices[0].message.content or "").strip()
            except Exception:  # rate limits or network: back off and retry
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt * 2)
        return ""

    def ask(self, model: str, prompt: str, max_tokens: int = 8) -> str:
        key = hashlib.sha256(f"{model}\n{prompt}".encode()).hexdigest()
        if key not in self.cache:
            self.cache[key] = self._call(model, prompt, max_tokens)
        return self.cache[key]

    def save(self) -> None:
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(self.cache, indent=0))

    @staticmethod
    def _pick(text: str, options: list[str]) -> str:
        t = text.lower()
        for o in sorted(options, key=len, reverse=True):
            if o in t:
                return o
        return "unclear"

    def _judge(self, prompts: list[str], options: list[str]) -> dict:
        votes = []
        for model, prompt in zip(self.models, prompts):
            ans = self._pick(self.ask(model, prompt), options)
            votes.append({"judge": f"{model.split('/')[-1]} (prompt {'AB'[len(votes)]})", "answer": ans})
        agree = len({v["answer"] for v in votes}) == 1 and votes[0]["answer"] != "unclear"
        self.judgments += 1
        self.agreements += int(agree)
        return {"answer": votes[0]["answer"] if agree else "disagree", "agree": agree, "votes": votes}

    def classify_ticket(self, subject: str, body: str) -> dict:
        # sla_policy.md: tickets hold card fragments, bank details and clients' lists, and ticket content
        # must not reach a new vendor without a DPA. Redact first; "off" sends nothing.
        subject, body = redact(subject or ""), redact((body or "")[:1500])
        return self._judge([PROMPT_A.format(subject=subject, body=body), PROMPT_B.format(subject=subject, body=body)],
                           TICKET_LABELS)

    def same_company(self, a: str, b: str) -> dict:
        return self._judge([SAME_A.format(a=a, b=b), SAME_B.format(a=a, b=b)], ["yes", "no"])

    def redraft(self, text: str, instruction: str) -> str:
        prompt = f"Rewrite this payment reminder. {instruction}\nKeep every number and date exactly.\n\n{text}"
        return self.ask(self.drafter, prompt, max_tokens=400)
