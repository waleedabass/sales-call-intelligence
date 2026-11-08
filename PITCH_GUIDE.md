# AI Sales Call Intelligence & CRM Copilot — Pitch Guide & Productionization Kit

Repo: https://github.com/waleedabass/sales-call-intelligence

---

## 1. Production-Conversion Prompt

```
I'm taking the sales-call-intelligence prototype to production for a real
client. Read AGENTS.md, CLAUDE.md, and README.md first, then do the
following:

CLIENT CONTEXT
- Client: [CLIENT_NAME], sales team of [TEAM_SIZE] reps
- Where calls actually happen: [ZOOM / GOOGLE_MEET / TEAMS / PHONE]
- CRM: [CLIENT_CRM — HubSpot/Salesforce/Pipedrive/other]
- HubSpot deal-property setup (or equivalent): see Section 2

CALL INGESTION (the real gap to close)
- The prototype only supports manual WAV upload. Build a real
  RecordingSourceProvider for [ZOOM/GOOGLE_MEET/TEAMS] — this requires
  registering an app on their respective marketplace (Zoom Marketplace,
  Google Workspace Admin, Microsoft Teams app registration) and is a real,
  multi-day approval process on their end, not just an API key. Start this
  early.
- If the client's calls come through Twilio-powered dialers, the Recordings
  API is a simpler API-key-only path — do that first if applicable.
- Add real audio-format transcoding (ffmpeg) — production calls will
  arrive as MP3/M4A, not just 16-bit PCM WAV.

TRANSCRIPTION AT SCALE
- Confirm Gemini's free-tier rate limits (20 requests/day) are nowhere
  near real call volume — get a paid Gemini/Vertex AI key, or switch the
  default to AssemblyAI (already built as a real alternate provider) for
  dedicated, more accurate diarization on real (not synthetic) audio,
  which tends to have crosstalk and background noise this prototype's
  demo call didn't need to handle.

CRM INTEGRATION
- Every deal that should receive CRM diff proposals needs
  Deal.hubspotDealId linked to a real HubSpot deal — build a real "link
  this deal" flow (search HubSpot by name/domain, or sync deals in from
  HubSpot in the first place) rather than expecting manual entry.
- Create the custom HubSpot properties this system writes to (next_step,
  competitor, risk_score) on the client's actual HubSpot portal, or remap
  src/lib/crm/hubspot.ts's field names to their existing properties.
- If the client uses Salesforce or Pipedrive instead, implement that
  behind the existing CrmProvider interface.

DATA LAYER
- Replace SQLite with Postgres — [CONNECTION_STRING].
- Move audio storage from local disk (/recordings) to real object storage
  (S3/R2/GCS) — [STORAGE_BUCKET].
- Consider pgvector for semantic search once the call library is large
  enough that in-app cosine similarity stops being instant.

BACKGROUND PROCESSING
- The pipeline currently runs synchronously inside the upload request —
  move to a real background job queue (Inngest, BullMQ, or the client's
  infra) for calls longer than a few minutes, so uploads don't time out.

DEPLOYMENT
- Deploy to [VERCEL/CLIENT_INFRA], custom domain, environment variables
  from Section 2.
- Add authentication + role-based access (reps see their own calls,
  managers see the team) — the prototype has none.

Test end-to-end with a handful of real recorded sales calls (not
synthetic) before handoff, covering at least one real objection and one
real next-step commitment.
```

---

## 2. Client Details Needed

**Brand & identity**
- Company name, logo, brand colors

**Team & calls**
- Sales team roster (names, emails) for coaching-dashboard grouping
- Which conferencing platform they actually use (Zoom/Meet/Teams/phone), and who owns getting a marketplace app registered/approved for automatic recording ingestion
- Typical call length and volume, for transcription cost/rate-limit planning

**CRM**
- Which CRM, API credentials, and — critically — permission/access to create custom deal properties (next_step, competitor, risk_score, or their existing equivalents)
- Their real deal pipeline stages, if the deterministic stage-advance rule should map to something other than "discovery → technical_evaluation"

**Risk scoring**
- What actually predicts a deal going sideways for their business (the prototype uses unresolved objections, broken commitments, competitor mentions, stage stagnation) — confirm or adjust the factor weights against their real deal history

**Coaching**
- What "good" looks like for their sales methodology (MEDDIC, Challenger, etc.) so coaching-note categories and grounding can reflect their actual playbook, not the generic categories built for the demo

**Compliance**
- Call-recording consent requirements for their states/countries (many require two-party consent) — this is a real legal requirement the client must handle, not something the software can assume away

**Access & auth**
- Team roster with role assignments (rep/manager/admin), preferred auth method

**Infra**
- Hosting preference, object storage account for recordings, database, expected call volume for capacity planning

---

## 3. Pitch Guide — Everything This Product Does

### The problem it solves

Sales reps forget to log what happened on a call, miss objections that needed follow-up, forget commitments they made, and managers have no reliable way to know which deals are actually at risk until it's too late. Generic call-recording tools produce a transcript and a summary — useful, but not action.

### The pitch, feature by feature

**1. Real transcription with speaker separation**
Every call is transcribed with the rep and prospect correctly separated, so the record isn't just "what was said" but "who said what" — the foundation everything else builds on.

**2. Evidence-linked extraction — click a claim, hear the moment**
Every objection, commitment, competitor mention, and next step the system extracts is linked to the exact transcript moment it came from. Click it, and the audio player jumps straight there. Nothing is asserted without a receipt.

**3. Deterministic deal risk, computed across a deal's entire call history**
Risk isn't guessed from one call in isolation — it's computed from real, aggregated evidence across every call on the deal: unresolved objections, broken promises, competitor mentions, how long it's been since the last call. The number is inspectable, not a black box, with an AI narrative that explains it using the real evidence.

**4. Proposed CRM updates — with evidence, gated by approval**
Instead of a rep manually updating CRM fields (or forgetting to), the system proposes exact field changes — the deal stage, the next step, a competitor to watch — each one linked to the call it came from. A manager approves or rejects each one; nothing writes to the CRM unreviewed.

**5. Coaching notes grounded in the actual call, not generic advice**
Every coaching note references a specific transcript moment — "handled the pricing objection well at [4:12]" — instead of a canned tip that could apply to any call.

**6. Semantic search across the entire call library**
Search "pricing objection" or "security concern" across every call ever recorded and jump straight to the real moments that match — not a keyword search, a real semantic search over what was actually said.

**7. Grounded follow-up drafting**
For every commitment a rep made, the system drafts the follow-up email referencing exactly what was promised — reviewed and editable before it counts as sent.

### Why this is agency-grade, not "average"

An average call-intelligence tool produces a transcript and a summary and stops there. This system understands account history across every call, proposes exact CRM field changes with evidence a manager can check, detects risk from real aggregated signals instead of one call's vibe, and never writes anything without human approval — which is the entire gap the brief calls out between "meeting notes" and a system that actually runs your pipeline.

### Recurring revenue angle

- Per-seat monthly pricing for reps whose calls get processed
- Transcription usage-based add-on for high call volumes
- CRM integration setup fee per additional platform
- Upsell: a full sales-enablement call library, outbound automation tied to detected objections, revenue forecasting from aggregated risk scores

### Suggested live demo script

1. Play (or upload) a real call with a security objection, a promised document, a competitor mention, and a next step.
2. Show the transcript viewer — click an extracted objection, watch the audio jump to that exact moment.
3. Show the deal risk score and its real factor breakdown, and the AI narrative referencing the actual objection/competitor by name.
4. Show the CRM diff screen — approve a proposed field change, watch it apply.
5. Show the drafted follow-up email, referencing the real promised document.
6. Run a semantic search across the call library for a topic and jump straight to the moment.


## Public Pixel sample

The public entry and `/demo` run editable, browser-isolated sample workflows. No live email, payment, CRM update or paid AI request is made. Records reset on reload. Existing provider integrations remain available behind explicit private access. Set `ENABLE_LIVE_DEMO=true`, `DATABASE_URL` and a private `PIXEL_LIVE_ACCESS_TOKEN` of at least 32 characters; authenticate internal requests using the `pixel-live-access` cookie or a Bearer header. Keep provider keys server-side. Public POSTs and APIs are blocked. Do not enable integration mode for anonymous visitors.

Run `npm ci`, `npm test`, `npm run lint`, and `npm run build`. Production uses the linked Vercel project.
