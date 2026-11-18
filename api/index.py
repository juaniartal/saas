import json
import os
from typing import Literal

from fastapi import FastAPI, Depends, HTTPException  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from pydantic import BaseModel, Field  # type: ignore
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials  # type: ignore
from openai import OpenAI  # type: ignore

app = FastAPI()
clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)

MODEL = os.getenv("OPENAI_MODEL", "gpt-5-nano")
REQUIRED_PLAN = "premium_subscription"  # must match the plan slug in Clerk Billing / pages/product.tsx
MAX_NOTES_CHARS = 8000  # keep in sync with MAX_NOTES in pages/product.tsx

Language = Literal["English", "Spanish", "Portuguese", "French", "German", "Italian"]


class Visit(BaseModel):
    patient_name: str = Field(min_length=1, max_length=120)
    date_of_visit: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    notes: str = Field(min_length=1, max_length=MAX_NOTES_CHARS)
    language: Language = "English"


system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.
Reply with exactly three sections, in this order, using exactly these headings (always in English):
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language

Guidelines:
- Summary: concise, clinical, use bullet points where helpful. Do not invent findings that are not in the notes.
- Next steps: an actionable bulleted checklist (medications, tests, referrals, follow-up timing).
- Email: warm, clear, jargon-free, addressed to the patient by first name, written in {language}.
- If something important is missing or ambiguous in the notes, say so briefly in the summary.
"""


def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""


def has_plan(claims: dict, plan: str) -> bool:
    """Mirror of Clerk's own check: the `pla` claim looks like "u:premium_subscription,o:team".
    Scope prefixes: u = user, o = organization, ou/uo = both."""
    raw = claims.get("pla")
    if not isinstance(raw, str):
        return False
    for part in raw.split(","):
        scope, sep, value = part.strip().partition(":")
        if sep and scope in {"u", "o", "ou", "uo"} and value == plan:
            return True
    return False


@app.post("/api")
@app.post("/api/consultation")  # same path as the AWS server (api/server.py)
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    user_id = creds.decoded["sub"]  # Available for tracking/auditing

    # The frontend <Show> only hides the UI; this is the real paywall.
    if not has_plan(creds.decoded, REQUIRED_PLAN):
        raise HTTPException(status_code=403, detail="An active Premium subscription is required.")

    client = OpenAI()

    prompt = [
        {"role": "system", "content": system_prompt.format(language=visit.language)},
        {"role": "user", "content": user_prompt_for(visit)},
    ]

    stream = client.chat.completions.create(
        model=MODEL,
        messages=prompt,
        stream=True,
    )

    def event_stream():
        # Each SSE event carries one JSON-encoded text chunk, so newlines and
        # leading spaces reach the browser exactly as the model produced them.
        for chunk in stream:
            if not chunk.choices:
                continue
            text = chunk.choices[0].delta.content
            if text:
                yield f"data: {json.dumps(text)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
