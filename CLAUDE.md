# CN Deliveries TMS

Transport Management System for CN Deliveries (Chișinău, Moldova).

**Read first:**
- `docs/context.md`: business context, statuses, pricing, payment methods, phases (all decisions agreed with the owner).
- `docs/progress.md`: what is done and what is next. **Update it when you finish a step.**

## Stack
Next.js 15 (App Router, TypeScript) · PostgreSQL · Prisma 6 · next-intl (ro/ru/en, cookie-based locale, no locale in URLs) · Tailwind 4 · custom cookie session auth (jose + bcryptjs) · worker process (`node-cron`) for Google Sheets sync · bwip-js barcodes on a printable HTML label page (`/labels`) · Vitest.

## Layout
- `prisma/schema.prisma`, `prisma/seed.ts`
- `src/lib/`: domain logic (`status.ts`, `pricing.ts`, `shipments.ts`, `tracking.ts`, `money.ts`, `dates.ts`, `labels.ts`, `auth.ts`, `db.ts`)
- `src/app/(office)/`: office UI (dashboard, shipments, clients, settings)
- `src/app/courier/`: courier mobile app (today, parcel `s/[id]`, `scan`, `cash`); rules in `src/lib/courier.ts`; uploads in `src/lib/uploads.ts`
- `src/app/track/`: public tracking page (no login; never show personal data)
- `src/app/(office)/scan`: warehouse scan mode; `src/lib/shipmentFilters.ts`: list tabs/filters shared with CSV export (`src/app/api/export/shipments`)
- `src/app/login/`, `src/app/labels/` (print page), `src/app/actions/` (server actions), `src/app/api/health`
- `src/worker/`: background jobs (`sheets/map.ts` pure row parsing, `sheets/sync.ts` import + write-back)
- `messages/{ro,ru,en}.json`: all UI strings, keep the 3 files in sync

## Rules
- Status changes go only through `changeStatus()` / `recordCodAndChangeStatus()` in `src/lib/shipments.ts` (validate the transition, write `StatusEvent`, queue the Sheets write-back). The one exception is the office correction `undoLastStatus()` (same file), which marks the last step undone instead of adding one; queries that count steps filter `undoneAt: null`.
- Prices come only from `calculateFee()` in `src/lib/pricing.ts`.
- Money is stored as integer **bani** (1 MDL = 100 bani) and shown as MDL.
- Every new UI string goes into all 3 message files.
- Icons: `lucide-react` only (no emoji). Phones: store via `normalizePhone()`.

## Local setup
```bash
docker compose up -d db   # run outside the Claude sandbox (it cannot reach the Docker socket)
cp .env.example .env
npm install
npm run db:setup  # migrate deploy + seed (zones, localities, admin@cn-deliveries.com / admin123, demo data)
# schema change: edit prisma/schema.prisma, then `npx prisma migrate dev --name <change>`
npm run dev       # applies pending migrations, then http://localhost:3000 (courier app: /courier)
npm run worker    # Google Sheets sync (needs GOOGLE_SERVICE_ACCOUNT_JSON)
npm test
```
Notes: inside the Claude Code sandbox, npm needs `npm_config_cache=$TMPDIR/npm-cache`, and it cannot start Postgres or reach the Docker socket, so run `docker compose up -d db` from a normal terminal.
