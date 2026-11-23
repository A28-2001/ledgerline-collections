"""Probe Groq models for the judge task: does each return a clean one-word label, and how fast?"""
import time

from groq import Groq

c = Groq()
PROMPT = ("Classify the customer's message for a collections team. Reply with one of: billing_complaint, "
          "serious_escalation, other_complaint, not_a_complaint. Anything questioning how much they pay counts as "
          'billing_complaint.\nMessage: "Question about this month. Why did this month\'s number jump so much? '
          'We didn\'t add anyone to the team."\nAnswer:')
for model in ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]:
    for extra in ({}, {"reasoning_effort": "low"}, {"reasoning_format": "hidden"}, {"reasoning_effort": "none"}):
        t = time.time()
        try:
            r = c.chat.completions.create(model=model, temperature=0, max_tokens=400,
                                          messages=[{"role": "user", "content": PROMPT}], **extra)
            msg = r.choices[0].message
            print(f"{model:22s} {str(extra):32s} {time.time()-t:4.1f}s tokens={r.usage.completion_tokens:4d} "
                  f"content={msg.content!r:.60}")
        except Exception as e:
            print(f"{model:22s} {str(extra):32s} ERROR {type(e).__name__}: {str(e)[:90]}")
