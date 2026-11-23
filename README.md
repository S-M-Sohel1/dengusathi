# ডেঙ্গুসাথী (DengueSathi)

AI-powered Bangla voice assistant for home monitoring of dengue patients. Team Prompt_Pirates, NSTU.

- Proposal: `docs/proposal/`
- Implementation plan and known barriers: `docs/IMPLEMENTATION_PLAN.md`
- Clinical rule review sheet for a doctor: `docs/DOCTOR_REVIEW.md`
- Pitch notes (impact model, distribution, slide outline, judge Q&A): `docs/PITCH_NOTES.md`
- **Demo script (read before presenting): `docs/DEMO_SCRIPT.md`**
- AI validation results: `docs/VALIDATION_REPORT.md`

## What it does

| Screen | Path |
|---|---|
| Landing | `/` |
| New patient (no login) | `/new` |
| Patient home: status, fever-day timeline, daily fluid tracker, platelet/HCT trend, history | `/p/[id]` |
| Daily check-in: Bangla voice, typed text, or tap form, then confirm | `/p/[id]/checkin` |
| CBC report photo → AI-read values → confirm | `/p/[id]/cbc` |
| Nearest hospitals map, directions, 999 | `/p/[id]/hospitals` |
| One-page clinical handoff for the emergency doctor (English, QR, printable) | `/p/[id]/handoff` |
| Hospital / upazila dashboard with spike detection | `/dashboard` |
| Auto-playing "how it works" walkthrough | `/how-it-works` |
| Demo patient | `/p/demo-rahim` |

## Stack

T3 (pnpm, Next.js 15 App Router, tRPC 11, Prisma 6, Tailwind 4, no auth) · Gemini (voice, vision, text, TTS) with hedged Groq fallback · Neon Postgres · Leaflet + OpenStreetMap · Recharts.

## Setup

```bash
pnpm install
cp .env.example .env        # fill GEMINI_API_KEY (+ GROQ_API_KEY recommended) and the database URLs
pnpm db:push                # create tables
pnpm db:seed                # synthetic dashboard data + demo patient
pnpm dev                    # http://localhost:3000
```

Database: Neon (both URLs; `DATABASE_URL` pooled, `DIRECT_URL` direct), Supabase (pooler 6543 + `?pgbouncer=true` / direct 5432), or local Docker.

Phone testing needs HTTPS for mic and camera: deploy to Vercel or run `cloudflared tunnel --url http://localhost:3000`.

## Scripts

| | |
|---|---|
| `pnpm dev` / `pnpm build` | dev server / production build |
| `pnpm test` | Vitest: WHO rules, CBC unit parsing, spike detection (54 tests) |
| `pnpm typecheck` / `pnpm lint` | checks |
| `pnpm db:seed` | ~280 synthetic patients over 21 days + Sonapur spike + demo patient |
| `pnpm demo:reset` | re-create only the demo patient (run right before presenting) |
| `pnpm samples:cbc` | regenerate the synthetic CBC report images/PDFs in `public/samples/cbc/` |
| `node scripts/warm-demo.mjs [url]` | pre-cache the demo sentences and sample reports (instant AI answers on stage) |
| `node scripts/validate-ai.mjs` | end-to-end AI validation against the running app → `docs/VALIDATION_REPORT.md` |
| `node scripts/data/fetch-hospitals.mjs` | refresh hospital list from OpenStreetMap |
| `node scripts/data/make-alert-audio.mjs` | regenerate the spoken Bangla alerts (Gemini TTS) |

## Code map

```
src/lib/risk/thresholds.ts      all clinical thresholds (cite + have a doctor review these)
src/lib/risk/who-rules.ts       WHO warning-sign rule engine (pure, tested)
src/lib/risk/score.ts           rules + AI; AI can only raise the status
src/lib/risk/cbc-normalize.ts   CBC unit parsing + sanity ranges
src/lib/anomaly.ts              area spike detection (z-score + 1.5x ratio)
src/lib/ai/                     Gemini / Groq clients, prompts, schemas, cache, hedged fallback
src/lib/audio/toWav.ts          browser: recording -> 16 kHz mono WAV
src/lib/image/compress.ts       browser: photo -> ≤1600 px JPEG
src/server/api/routers/         patient, checkin, cbc, hospital, dashboard
src/server/services/assess.ts   re-run risk for a patient and store it
src/data/                       hospitals (OSM + hand-entered, check "approx" ones)
prisma/seed.ts                  synthetic data + demo patient
public/samples/cbc/             synthetic CBC reports (marked SAMPLE)
public/audio/                   spoken status alerts
```

## Free-tier notes (learned while building)

- `gemini-2.5-flash` is refused for new keys; `gemini-3.8-flash` and `3.5-flash` are often overloaded (503). `gemini-3.5-flash-lite` is the fastest reliable primary. Model IDs live in `.env`.
- Gemini latency is uneven (1 s to 90 s for the same image), so a request starts Groq in parallel after 12 s and takes the first answer.
- Gemini TTS free tier: 10 requests per day.
- AI answers are cached in the `AiCache` table by input: repeated demo inputs are instant and cost no quota.
- Neon free databases sleep when idle; the first request after a pause can fail once. Open the app before presenting.

## Safety

Not a diagnostic tool. WHO rules always take priority over the AI; users confirm every AI-extracted value; prototype uses synthetic data only.
