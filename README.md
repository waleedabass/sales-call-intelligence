# AI Sales Call Intelligence & CRM Copilot

A working prototype of ARC Automations' sales-call-intelligence product, built around the brief's own contrast: "the average tool creates meeting notes. The agency version understands account history, updates exact CRM fields, detects risk across multiple calls, preserves evidence, and allows manager approval." Every claim this app makes is linked back to the exact transcript moment it came from, deal risk is a deterministic number that aggregates a deal's *whole* call history, and nothing writes to the CRM without a human clicking approve.

Fictional vendor: **Cascade Analytics** (B2B SaaS), AE **Jordan Reyes**, mid-cycle with prospect **Brightline Retail** (buyer: **Morgan Ellis**).

## What's real right now, with zero paid accounts (beyond a free Gemini key)

- **Real audio transcription with speaker diarization** — Gemini's native audio understanding (no separate ASR/diarization service) transcribes and labels a two-speaker call in one call, verified live against a real WAV recording. See "a real bug worth knowing about" below.
- **A real, offline-generated demo call** (`sample-calls/generate-demo-call.ps1`) — synthesizes an actual playable two-speaker WAV using Windows' built-in SAPI text-to-speech, scripted to hit a security objection, a promised document, a competitor mention, and a concrete next step. Zero paid TTS API, same spirit as `document-ai`'s reportlab-generated sample invoices.
- **Evidence-linked extraction** — every objection, commitment, competitor mention, and next step is tagged with the exact transcript segment it came from, so the UI can jump from a claim straight to that moment in the audio.
- **Semantic call search** (`/`) — real Gemini embeddings + cosine similarity over transcript segments, same RAG plumbing as `support-agent`'s knowledge base search, re-implemented here.
- **Deterministic deal risk, not an AI-guessed number** (`/deals/[id]`, `/risk`) — computed in plain code from real factors aggregated across a deal's *entire* call history (unresolved objections, overdue commitments, competitor mentions, stage stagnation, days since last call), with an AI-written narrative that explains the number rather than inventing it. Risk snapshots are recorded on every recompute so `/risk` shows a genuine rising/falling trend.
- **CRM diff with human approval** (`/deals/[id]/crm-diff`) — proposed field changes are deterministic rules reading real extracted data (stage, next step, competitor, risk score), each shown as an old→new diff with a link to its evidence. Nothing applies until a manager clicks Approve.
- **Coaching notes grounded in the actual call**, not generic advice — every note references a specific transcript moment.
- **Follow-up drafting** (`/calls/[id]/follow-up`) — a grounded email draft for every commitment the rep made, editable before you approve and log it.

## A real bug worth knowing about

While building this, Gemini appeared to silently drop every other speaker's turns on the synthesized demo call — it looked exactly like a model limitation with multi-speaker audio. It wasn't. The WAV generator was inserting a silence buffer between turns sized in fractional milliseconds, which occasionally produced an odd (non-sample-aligned) byte count — and because that happened on every *other* insert, it corrupted every other speaker's turn while leaving the alternating ones clean. Once `generate-demo-call.ps1` was fixed to only insert whole-sample silence gaps, Gemini transcribed all 20 real turns correctly in a single call. Worth remembering: if a "the model is dropping content" bug looks suspiciously alternating or systematic, check the audio/data itself before blaming the model. See the comment in `src/lib/transcription/gemini.ts` for the short version.

Separately: transcription timestamps are model-estimated from audio content, not decoded from a precise clock, and were observed to drift on a longer call. Anchoring the prompt with the file's real (deterministically computed) duration measurably tightened that estimate, and `src/lib/transcription/normalize.ts` clamps every timestamp into `[0, realDuration]` as a hard backstop regardless — a timeline click should never be able to seek past the end of the recording.

## What needs a key from you, in the order to get them

| Stage | Provider | Cost to start | Env var |
|---|---|---|---|
| Transcription (required) | [Google AI Studio](https://aistudio.google.com/apikey) | Free tier, no card | `GEMINI_API_KEY` |
| Transcription (optional upgrade — real acoustic diarization) | [AssemblyAI](https://www.assemblyai.com/dashboard) | Free trial, no card | `ASSEMBLYAI_API_KEY` |
| Insight extraction, coaching, risk explanation, follow-up drafts | Gemini (above), [Anthropic](https://console.anthropic.com), or [OpenRouter](https://openrouter.ai/keys) | Gemini/OpenRouter free tier, Anthropic pay-as-you-go | `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` |
| CRM sync | [HubSpot private app](https://developers.hubspot.com/docs/api/private-apps) | Free developer account | `HUBSPOT_API_KEY` |

Copy `.env.example` to `.env` and fill in what you have. With just a Gemini key, the entire pipeline runs end-to-end.

## Running it

```bash
npm install
npm run seed   # seeds Cascade Analytics' 3 demo deals, including Brightline Retail
npm run dev
```

Then:

1. **`/calls/new`** — click "Process the demo call" to run the real Cascade ↔ Brightline recording through the full pipeline (transcribe → embed → extract → coach → score risk → propose CRM changes → draft follow-ups), or upload your own 16-bit PCM WAV against one of the other seeded deals.
2. **`/calls/[id]`** — the transcript viewer. Click any turn to seek the audio player to that exact moment; objections, commitments, competitor mentions, and next steps are tagged inline.
3. **`/deals/[id]`** — the deal summary: risk score with its factor breakdown and AI narrative, and every piece of evidence extracted across all of the deal's calls.
4. **`/deals/[id]/crm-diff`** — approve or reject each proposed CRM field change.
5. **`/calls/[id]/follow-up`** — review, edit, and approve-and-log the drafted follow-up email for each commitment the rep made.
6. **`/coaching`** and **`/risk`** — the aggregate dashboards.
7. **`/`** — the call library, with semantic search over every transcript ever processed.

To regenerate the demo audio (e.g. after editing the script):

```powershell
./sample-calls/generate-demo-call.ps1
```

## Architecture notes

- **Same conventions as the other four ARC projects**: Next.js 16 + Prisma 7 with the `@prisma/adapter-better-sqlite3` driver adapter, Server Actions for mutations, provider interfaces (`TranscriptionProvider`, `CallInsightProvider`, `CoachingProvider`, `RiskExplainProvider`, `FollowUpDraftProvider`, `CrmProvider`) so a real upgrade slots in without touching business logic. Same 8-color minimal palette across all five, for a portfolio that reads as one body of work.
- **No separate ASR/diarization service by default** — same reasoning as `document-ai` skipping a separate OCR step: the main model already does it, and doing it via a dedicated call would just add latency and a second thing that can drift out of sync with the rest of the pipeline.
- **Deal risk and CRM proposals are deliberately not AI** — deterministic, inspectable, reproducible. An AI-guessed risk number or CRM value would fail exactly the test the brief sets: "the agency version... detects risk across multiple calls" implies a real aggregation a manager could audit, not a vibe.
- **Semantic search re-implements `support-agent`'s exact approach** (Gemini embeddings + in-app cosine similarity) rather than importing it — each ARC prototype stays self-contained and independently deployable, same as the Greenhouse/Lever re-implementation in `lead-qualification`.
- **Files stored on local disk** (`/recordings`, gitignored), path referenced in the DB — same as `document-ai`'s `/uploads` pattern, no S3 dependency needed at prototype scale.

## Known limitations, on purpose

- **16-bit PCM WAV only.** Real conferencing exports (MP3, M4A, compressed formats) would need transcoding — out of scope for a prototype; a client build would add `ffmpeg` at the upload step.
- **No real Zoom/Google Meet/Microsoft Teams recording ingestion** — all three require registering and getting an app reviewed on their respective marketplaces, the same bucket as QuickBooks/Xero in `document-ai`. Manual upload is the one ingestion path guaranteed to work regardless of which conferencing tool a team uses, exactly how Gong/Fireflies/Avoma all support upload too.
- **HubSpot deal sync requires a deal already linked** (`Deal.hubspotDealId`) and custom properties (`next_step`, `competitor`, `risk_score`) created on your HubSpot portal — deals don't have a natural unique key like a contact's email, so unlike the contact-upsert pattern in the other ARC projects, this can only PATCH an existing linked deal, not create one from scratch.
- **No real email-sending integration** exists anywhere in this portfolio yet — follow-up approval always logs what would be sent.
- **Commitment "broken" status is date-based only** — a commitment becomes overdue (and feeds into risk) only if the model captured a concrete, parseable due date. Natural-language commitments like "by tomorrow morning" are preserved in the commitment text but don't set a structured due date, since guessing a real calendar date from relative phrasing isn't something this pipeline does.
- **The `next_step` / `competitor` / `risk_score` "CRM fields" are synthetic** — there's no standard HubSpot property for them; a client deployment would map these to whatever custom properties (or existing standard ones) their actual HubSpot portal uses.
