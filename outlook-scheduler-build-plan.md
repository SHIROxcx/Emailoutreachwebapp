# Build Plan — Outlook Outreach Scheduler (MVP Scope)

**Scope:** Connect Outlook → upload leads → build a sequence → schedule & send.
No CRM sync, no reply detection, no tracking pixels yet — those come after this works.

**Stack:** Next.js (React + API routes) on the frontend/backend, PostgreSQL for data, Redis + BullMQ for the scheduler/queue, deployed on Vercel (app) + Neon or Render (Postgres) + Upstash (Redis). This stack is chosen because Microsoft's Graph SDKs and MSAL auth libraries are first-class in Node/JS, and Next.js lets you ship UI + API from one codebase while you're still small.

---

## Phase 0 — Project Setup (Day 1)

1. `npx create-next-app@latest outreach-app` (TypeScript, App Router).
2. Set up Postgres (local Docker for dev, Neon for hosted) and Redis (local Docker, Upstash for hosted).
3. Install core deps:
   ```
   npm install @azure/msal-node @microsoft/microsoft-graph-client
   npm install bullmq ioredis
   npm install prisma @prisma/client
   npm install papaparse   # CSV parsing
   npm install next-auth   # optional, or roll your own OAuth handling
   ```
4. Init Prisma (`npx prisma init`) and point it at your Postgres instance.
5. Set up `.env` for secrets (never commit): `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID` (use `common` for multi-tenant), `DATABASE_URL`, `REDIS_URL`, `TOKEN_ENCRYPTION_KEY`.

---

## Phase 1 — Microsoft Entra App Registration (Day 1–2)

1. Go to **Azure Portal → Microsoft Entra ID → App registrations → New registration**.
2. Name it, set "Supported account types" to **"Accounts in any organizational directory and personal Microsoft accounts"** (this is what makes it work for any customer's Outlook, not just yours).
3. Add a **Redirect URI** (type: Web) → `http://localhost:3000/api/auth/microsoft/callback` for dev, add your prod URL later too.
4. Under **Certificates & secrets**, create a new client secret — copy it immediately (shown once).
5. Under **API permissions**, add Microsoft Graph **delegated** permissions: `Mail.Send`, `Mail.Read`, `User.Read`, `offline_access`. Do NOT add application permissions — you want delegated (acting as the logged-in user), not app-only.
6. Note your **Application (client) ID** — this is `MS_CLIENT_ID`.
7. Leave admin consent for now; you'll deal with publisher verification later once you have real customers (flag this as a task, not a blocker for building).

---

## Phase 2 — Database Schema (Day 2–3)

```prisma
// prisma/schema.prisma

model Tenant {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  users     User[]
  leads     Lead[]
  campaigns Campaign[]
}

model User {
  id        String   @id @default(cuid())
  tenantId  String
  email     String   @unique
  createdAt DateTime @default(now())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  mailboxConnections MailboxConnection[]
}

model MailboxConnection {
  id                    String   @id @default(cuid())
  userId                String
  msAccountEmail        String
  accessTokenEncrypted  String
  refreshTokenEncrypted String
  tokenExpiresAt        DateTime
  dailySendCount        Int      @default(0)
  dailySendResetAt      DateTime @default(now())
  status                String   @default("connected") // connected | expired | revoked
  user                  User     @relation(fields: [userId], references: [id])
}

model Lead {
  id             String   @id @default(cuid())
  tenantId       String
  email          String
  firstName      String?
  lastName       String?
  company        String?
  customFields   Json?
  status         String   @default("active") // active | unsubscribed | bounced
  importBatchId  String?
  createdAt      DateTime @default(now())
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
  enrollments    SequenceEnrollment[]
}

model Campaign {
  id                  String   @id @default(cuid())
  tenantId            String
  name                String
  mailboxConnectionId String
  status              String   @default("draft") // draft | active | paused | done
  tenant              Tenant   @relation(fields: [tenantId], references: [id])
  sequence            Sequence?
}

model Sequence {
  id         String   @id @default(cuid())
  campaignId String   @unique
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  steps      SequenceStep[]
}

model SequenceStep {
  id              String   @id @default(cuid())
  sequenceId      String
  stepOrder       Int
  delayDays       Int      // days after previous step (0 for first step)
  subjectTemplate String
  bodyTemplate    String
  sequence        Sequence @relation(fields: [sequenceId], references: [id])
  enrollments     SequenceEnrollment[]
}

model SequenceEnrollment {
  id           String   @id @default(cuid())
  leadId       String
  sequenceId   String
  currentStepId String?
  nextSendAt   DateTime
  status       String   @default("active") // active | paused | completed | bounced
  lead         Lead     @relation(fields: [leadId], references: [id])
}

model SendLog {
  id             String   @id @default(cuid())
  enrollmentId   String
  stepId         String
  sentAt         DateTime @default(now())
  graphMessageId String?
  status         String   // sent | failed
  errorMessage   String?
}
```

Run `npx prisma migrate dev --name init` to create the tables.

---

## Phase 3 — OAuth Connect Flow (Day 3–5)

1. **`/api/auth/microsoft/login`**: build the MSAL authorization URL (using `@azure/msal-node`'s `ConfidentialClientApplication.getAuthCodeUrl()`) with your redirect URI and scopes, redirect the user there.
2. **`/api/auth/microsoft/callback`**: receive the `code` query param, call `acquireTokenByCode()` to exchange it for access + refresh tokens.
3. Call Graph's `/me` endpoint with the new access token to get the connected mailbox's email address.
4. Encrypt both tokens (AES-256-GCM with a key from your KMS or env var to start) and upsert a `MailboxConnection` row.
5. Build a small **token refresh helper**: before every Graph call, check `tokenExpiresAt`; if expired, use `acquireTokenByRefreshToken()` to get a new access token and update the stored (encrypted) value.

---

## Phase 4 — Lead Upload (Day 5–6)

1. Simple upload page: file input (CSV) + a preview table.
2. Parse client-side or server-side with `papaparse`.
3. Column-mapping step: let the user map their CSV columns to `email`, `firstName`, `lastName`, `company` (don't assume column order/names match — this is the #1 support-ticket generator if skipped).
4. On confirm, bulk-insert into `Lead` with a shared `importBatchId`, de-duping on `email` within the tenant.

---

## Phase 5 — Sequence Builder UI (Day 6–9)

1. Campaign creation: name + pick which connected mailbox to send from.
2. Step builder: add steps, each with:
   - Delay (days after previous step, 0 for first)
   - Subject line (with a merge-field picker: `{{firstName}}`, `{{lastName}}`, `{{company}}`)
   - Body (plain text to start — rich text/HTML editor can come later)
3. Enrollment: pick an uploaded lead batch → assign to the campaign's sequence → for each lead, create a `SequenceEnrollment` with `currentStepId = null`, `nextSendAt = now` (or a scheduled start time/date).

---

## Phase 6 — The Scheduler / Sending Worker (Day 9–13, the core engine)

This is the heart of the product — take it slow here.

1. **Queue setup**: use BullMQ with a repeatable job that runs every 5 minutes (`queue.add('check-due-sends', {}, { repeat: { every: 5 * 60 * 1000 } })`).
2. **Worker logic** on each run:
   ```
   SELECT * FROM SequenceEnrollment
   WHERE status = 'active' AND nextSendAt <= now()
   FOR UPDATE SKIP LOCKED
   LIMIT 100
   ```
   (`FOR UPDATE SKIP LOCKED` is important if you ever run more than one worker — it prevents two workers from grabbing the same enrollment.)
3. For each due enrollment:
   a. Look up the lead, the sequence's next step (first step if `currentStepId` is null, otherwise the step after current), and the campaign's mailbox connection.
   b. Check the mailbox's `dailySendCount` against a configured cap (start conservative — 30–50/day per mailbox); if over cap, leave `nextSendAt` as-is and skip (it'll be picked up on a later run once the daily counter resets).
   c. Render `subjectTemplate`/`bodyTemplate` with the lead's fields (simple `{{firstName}}` string replace, or a templating lib like `mustache` for anything more than basic substitution).
   d. Refresh the Graph access token if needed (Phase 3 helper).
   e. Call Graph's `POST /me/sendMail` with the rendered subject/body/recipient.
   f. On success: write a `SendLog` row, increment `dailySendCount`, set `currentStepId` to this step, and compute the next `nextSendAt` (now + next step's `delayDays`), or set `status = 'completed'` if this was the last step.
   g. On failure: write a `SendLog` row with the error, and either retry (with backoff) or mark the enrollment for manual review depending on the error type (invalid recipient vs. transient Graph error).
4. **Randomize send timing** within each 5-minute batch (e.g., stagger actual send calls by a few seconds to a minute apart) rather than firing all 100 at once — this alone meaningfully reduces the "looks automated" signal to Microsoft.
5. **Daily counter reset**: a simple scheduled job at midnight (per mailbox's local time zone, or just UTC to start) resets `dailySendCount` to 0 and updates `dailySendResetAt`.

---

## Phase 7 — Minimal Dashboard (Day 13–15)

- Campaign list with status (draft/active/paused/done) and basic counts (enrolled, sent, remaining).
- Per-campaign view: list of leads with their current step and last-sent date.
- "Pause campaign" button (sets all its enrollments to `paused`, worker skips paused ones).

---

## Suggested Milestone Order (so you always have something working)

1. Connect Outlook, confirm you can send **one manual test email** via Graph from the UI. (Proves the OAuth + sending pipeline end to end before any scheduling complexity.)
2. Upload a CSV, see leads in a table.
3. Build a 1-step sequence, enroll leads, manually trigger the worker once, confirm emails go out.
4. Turn on the repeatable scheduler, test with a 2-step sequence with a short delay (e.g., 2 minutes instead of 2 days, for testing) to confirm the delay/advance logic works.
5. Add the daily cap + stagger logic.
6. Polish the dashboard.

---

## What to deliberately skip for now (per your scope)

- Reply detection / auto-pause
- Bounce parsing
- Open/click tracking
- CRM sync (Zoho etc.)
- Billing/multi-tenant plan tiers beyond a basic `Tenant` table

These all bolt onto this same schema later without needing a redesign — `SequenceEnrollment.status` already has room for a `replied`/`bounced` value whenever you're ready to add that logic.

---

## Immediate next actions for you

1. Register the Azure app (Phase 1) — this can take a little back-and-forth in the Azure portal, good to start it now even before writing code.
2. Decide on hosting for Postgres/Redis for local dev vs. a hosted dev environment.
3. Once the Azure app credentials are in hand, the first real coding milestone is Milestone 1 above (send one manual test email) — that's the moment the whole concept is proven end to end.
