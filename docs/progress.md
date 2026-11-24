# Progress tracker

Update this file whenever a step is started or finished. `[x]` done, `[~]` in progress, `[ ]` not started.

## Phase 1 — Office
- [x] 1. Scaffold: package.json, Next.js 15, Prisma 6 schema, Docker Compose, env
- [x] 2. Core libs: status machine, pricing, tracking numbers, money, Moldova dates + Vitest tests
- [x] 3. Auth (cookie session, roles) + ro/ru/en i18n + app layout
- [x] 4. Clients CRUD (sheet link, column mapping, price overrides), zones/pricing settings, users/couriers
- [x] 5. Shipments: list + filters, create/edit, detail with timeline, bulk status / bulk courier assign, COD recording
- [x] 6. Labels (printable 100×150 mm HTML page, browser prints or saves PDF), courier manifest, COD report, dashboard
- [x] 7. Google Sheets worker (import new rows + write status back) + Sync page (code done; needs service account to test live)
- [x] 8. Verification: 19 unit tests, typecheck and build pass; verified in browser: login, RO/RU switch, create shipment (auto zone + fee), status flow, COD validation + recording, delivered, labels, bulk courier/status, COD report, all pages 200 with no errors

## Phase 2 — Courier PWA
- [x] Schema: proof of delivery on StatusEvent (receivedBy, photoPath, signaturePath), CashHandover + CodPayment.handoverId (migration `20261117000000_courier_app`)
- [x] `/courier` today list, `/courier/s/[id]` parcel (call, map, status buttons), `/courier/scan` (live camera on HTTPS, photo-of-label fallback, manual entry), `/courier/cash`
- [x] Delivery: COD (method + receipt no.), receiver name, photo (compressed to 1600px), finger signature; one transaction
- [x] Failed attempt / on hold / refused with reason + optional photo; postponed with date; courier can take an unassigned parcel
- [x] Office: proof shown in shipment history; `/cod` "Cash held by couriers" + confirm handover (guarded against stale amounts)
- [x] Installable (manifest + generated icons), RO/RU/EN
- [x] Verified in browser (phone viewport): full delivery with COD + proof, validation errors, failed attempt, claim, QR decode from label photo, handover
- [ ] Offline mode (service worker + queued updates) — not built; needs decision if couriers often lose signal
- [ ] Live camera scanning on phones needs HTTPS → works after deploy (phase 4); until then use "Take a photo of the label"

## Design & usability pass (2026-11-17)
- [x] SVG icons (lucide-react) instead of emoji; pointer cursors, visible focus rings, reduced-motion; 44px touch targets in courier app
- [x] Public tracking page `/track` and `/track/[no]` (label QR now works). Shows status, steps, dates, locality, sender only — no name/phone/street (tracking numbers are sequential)
- [x] Dashboard rebuilt: KPIs (active, delivered today, COD today, cash with couriers), pipeline bar, "Needs attention" (failed/on hold/refused + no zone/no courier/sync errors), couriers today
- [x] Shipments list: tabs with counts (Active/New/At warehouse/Out/Problems/Delivered today/All), default = Active, CSV export (Excel-ready), tighter table
- [x] Office header search: tracking no. (typed or USB-scanned) opens the shipment; otherwise searches name/phone/address/locality
- [x] Warehouse scan page `/scan`: each scan sets a status and/or courier, beep feedback, double scans tolerated
- [x] Phones normalized to "+373 XX XXX XXX" (form + Sheets import) and searchable in any format
- [x] Users page compact (expand to edit), "new zone" collapsed, sidebar badge for problem shipments
- [x] E2E verified: 23 pages × 3 languages, office + courier + public flows, no server/console errors
- Decided NOT to build (overkill for 1–3 couriers): live driver map, route optimization, auto-dispatch

## Redesign & UX pass (2026-11-17)
- [x] Brand: new parcel mark (`src/components/Logo.tsx`), favicon `src/app/icon.svg`, home-screen icons from the same drawing (`/icons/[size]`), site blue + logo navy as tokens in `globals.css`, Onest + JetBrains Mono self-hosted (Romanian + Cyrillic)
- [x] Design system in `src/components/ui.tsx` (Button sizes/variants, fields, Card `flush`, Table, Alert, EmptyState, Skeleton, Tracking), motion tokens and reduced-motion rules in `globals.css`, toasts (sonner), sheets/drawers (vaul)
- [x] `RouteLine`: one route-with-stops drawing shared by dashboard, shipment page and public tracking
- [x] Office shell: grouped sidebar (drawer below 1280px), header search (`/` or Ctrl/⌘+K), Scan + New shipment always in the header, loading skeleton, page fade
- [x] Dashboard: live flow by stage, exceptions as chips, 3 money/volume tiles, attention list, courier progress; auto-refresh every 30 s
- [x] Shipments: pill tabs, filters apply on change, click-anywhere rows, floating bulk bar on selection; shipment page with route, next-step card, COD progress, timeline; form with live price summary
- [x] Courier app rebuilt: day progress, sections (deliver now / pick up / with me), one primary action per parcel, bottom sheets for delivery, problems and account, scan viewfinder, offline banner, safe areas
- [x] COD (stat tiles, date presets, handover cards), clients, users, zones (locality chips), sync, manifest, warehouse scan station, label (mark + larger address), login, tracking
- [x] Verified in browser: 26 pages × 3 languages return 200 with no missing strings; create shipment, status change, bulk status, warehouse scan, courier delivery with COD + signature, failed attempt, language switch; 26 unit tests, typecheck and production build pass
- Not verified: real phone (safe areas, camera scanning needs HTTPS, vibration, sheet drag feel), printing on the label printer
- Gotcha: `ActionForm` wraps children in `<fieldset class="contents">`, so `space-y-*` on the form does nothing; use `grid gap-*` or `flex flex-col gap-*`
- New UI strings go through all 3 message files (61 office, 48 courier, ~45 shell/shipments/login/track added in this pass)

## Design direction (open, 2026-11-17)
- The owner rejected the look of the redesign pass above ("AI style"). The app code still carries it; do not extend it.
- Direction is being chosen from static drafts in `public/drafts/` (index at `/drafts`, needs login). Drafts 11–13 are interactive prototypes sharing `proto.js` / `proto.css`; 1–10 are stills. Draft 4 is the only one the owner called "much better".
- Owner rules so far: never a dark theme; "independent designs" must be fully different screens (layout, components, how couriers/status/money are shown), not recolours.
- [ ] Owner picks a direction, then rebuild the app UI on it (tokens in `globals.css`, primitives in `src/components/ui.tsx`, office + courier + tracking + login).

## Switchable designs (2026-11-17)
The owner asked for the seven candidate designs to be built into the app with a switch, to decide by using them.
- [x] Design switch: ids `dispecerat` (draft 4, default), `kraft` (8), `semnal` (9), `verde` (10), `tactil` (11), `aer` (12), `expres` (13) in `src/lib/design.ts`; stored per browser in the `design` cookie (`src/app/actions/design.ts`), set on `<html data-design>` by the root layout.
- [x] Settings → Aspect (`/settings/design`) with live previews; the courier's account sheet has the same choice.
- [x] `src/app/designs/tokens.css`: each design's colours, type, radii, control sizes, and a remap of the Tailwind tokens (brand, ink, slate, floor, radius, fonts) so every shared page follows the design. `base.css`: shared controls (`.ui-*`, used by `src/components/ui.tsx`) and the four office menus (`.sh-*`): top bar, side menu, floating capsule, rail (`src/components/shell/OfficeShell.tsx`). Below 1024px every design uses a compact bar with a slide-in menu.
- [x] ~~"Azi" day screen per design~~ replaced on 2026-11-21 by one homepage for all designs (see "Homepage and courier day"); `loadDay()` and the actions in `src/components/day/shared.tsx` remain.
- [x] Courier app follows the design (`src/app/designs/courier.css`, `src/lib/courierDay.ts`).
- When the owner chooses: delete the other designs' token blocks, day screens and CSS files, the `design` cookie/action/settings page, and `public/drafts/`.
- Gotchas: design CSS lives in `@layer components` so utilities can still override; shadows are inlined in Tailwind utilities, so `.shadow-card` is restated per design in `tokens.css`; a client module's non-component exports are not readable from server components (menu icons live in `src/components/navIcons.ts` for that reason).

## Second round of designs (2026-11-17)
The owner asked for designs that feel like a professional design studio's work, with real motion ("wow", iOS-level polish).
- [x] Built Insula, Flux and Folio. Verdict: Insula (iOS 26) kept; Flux (Swiss poster) and Folio (newspaper/ledger) rejected and deleted. Never propose those two styles again.
- [x] Built three more: Radar (live radar map of the day around the depot, floating dock), Triaj (keyboard-first inbox with detail pane, ⌘K, G+letter jumps, N for new shipment), Val (Material 3 Expressive: navigation rail with FAB, wavy progress, shape morphing).
- Ids `insula`, `radar`, `triaj`, `val` in `src/lib/design.ts` (`NEW_DESIGNS`), shells `island` / `dock` / `inbox` / `navrail` in `OfficeShell.tsx` (their Today screens were replaced by the shared homepage on 2026-11-21), styles in `src/app/designs/{insula,radar,triaj,val}.css` (shell, Today, courier app), tokens in `tokens.css`.
- Each design has its own icon family (`src/components/navIconSets.tsx`): Phosphor (Insula), Tabler (Radar), Remix line (Triaj), Material Symbols via Iconify (Val). This departs from the lucide-only rule, at the owner's request for new icons; the rest of the app still uses lucide.
- Radar's map of the day went with its Today screen on 2026-11-21; `src/lib/geo.ts` (approximate coordinates of localities and Chișinău sectors) is kept for later use.
- Insula's Dynamic Island loads the day (`loadDay()`) in the office layout on every page, only when Insula is on (`src/lib/pulse.ts`).
- Settings → Design is now a showroom: the new designs as live previews of the real app (`?__design=<id>`, read by the middleware into a request header), switching plays a circular View Transition; older drafts are folded away.
- A second dev server can use its own build folder: `NEXT_DIST_DIR=.next-alt` (two servers sharing `.next` corrupt each other's manifests).
- Not verified: real phone, Safari/Firefox (View Transitions and scroll-driven animations are progressive enhancements there).

## Homepage and courier day (2026-11-21)
The owner asked for a homepage "full of graphs" with status and useful information, and to click a courier to see their plan and route for the day. Decisions: one homepage for every design (the 11 per-design "Azi" screens and `day-*.css` were deleted); no map on the courier page (a status page instead); addresses are not geocoded yet.
- [x] Homepage `src/app/(office)/page.tsx`: live today (`src/components/home/Live.tsx`: day bar linking to shipment filters, deliveries per hour vs the usual same weekday, money today, things to sort out with their actions, courier cards) and performance (`Performance.tsx`: 7/30/90-day switch `?p=`, 7 KPIs with trend line and change vs the period before, shipments per day, COD per day by method, outcomes, failure reasons, zones, top clients, weekday × hour heatmap, courier table).
- [x] Numbers in `src/lib/stats.ts`: `computeStats()` is pure and tested (Moldova-time days, created-day cohort for outcomes and rates, delivered-day for deliveries and fees); `loadStats()` / `loadTodayFlow()` fetch the rows.
- [x] Courier day `/couriers/[id]` (`?d=YYYY-MM-DD` for earlier days): `src/lib/courierRoute.ts` + `src/components/home/CourierDay.tsx` — state, figures, the day on an 08–20 line, what was done (pickups, deliveries with receiver and payment, failures with reason) and today's remaining stops in courier-app order.
- [x] Charts are server-rendered SVG (`src/components/home/charts.tsx`), hover labels from one small client component (`Tips.tsx`); all styling in `src/app/designs/home.css` reads the design tokens (`--d-*`), so the page follows every design.
- Mock data: `npm run seed:mock` (`prisma/mock.ts`) builds 120 days of history with a random seed (printed; `--seed <n>` repeats it, `--reset` replaces the previous mock data).
- Dev server runs on Turbopack (`npm run dev`); `npm run dev:webpack` is the fallback.
- Not verified: real phone; Safari/Firefox.

## Company brand (2026-11-21)
The owner asked for everything to use the logo and colours of cn-deliveries.com. Decisions: all 11 designs keep their layout, shapes, menus and motion but wear the website's palette; DM Sans everywhere; the website's logo file for the full logo, the two boxes redrawn as a vector for small spots.
- [x] Palette: one shared `[data-design]` block at the end of `src/app/designs/tokens.css` (the website's CSS variables, hue 215 blue `#186adc`, cool blue-grey neutrals, success/warning/destructive darkened where read as text), plus small per-design overrides where colour was the identity (Dispecerat bar → hero blue `#1b4f98`, Semnal bar → primary blue, Val tonal colours, Kraft/Verde docks, Insula/Radar/Tactil pages). Blue bars get a white "new order" button like the website's hero button (`base.css`).
- [x] Font: `@fontsource-variable/dm-sans`, imported in `src/app/layout.tsx`; `--font-sans` / `--d-display` point to it in every design.
- [x] Logo: `public/brand/cn-deliveries-logo.webp` is the website's file (trimmed). `src/components/Logo.tsx`: `LogoMark` = the two boxes, fitted to that file (95% pixel overlap), simplified and heavier below 48px; `Logo` = boxes + "CN DELIVERIES" in serif capitals; `BrandLogo` = the full logo image. Colour comes from `--logo-mark` (logo blue `#0c77eb`, white on blue bars).
- [x] Full logo on login, tracking search, portal, forbidden; boxes in menus, favicon (`src/app/icon.svg`), home-screen icons (`/icons/[size]`, blue on white), print label (black); manifest and status-bar colours follow the brand.
- `public/brand/cnx-*` and `public/brand/v2/` belong to the separate CNX rename/logo exploration, not to this brand.
- Not verified: real phone; printed label on the thermal printer.

## Correcting orders entered wrong (2026-11-22)
The owner asked to be able to fix orders entered by mistake. Office only (admin, dispatcher); every correction stays in the order's history.
- [x] Payments: each COD payment on the order page has "Corectează" (amount, method, receipt no.) and "Șterge plata". Cash already handed in to the office keeps its amount and method (receipt no. only); a delivered order must keep payments covering its COD. `fixPayment()` in `src/lib/shipments.ts`, rules in `src/lib/corrections.ts` (tested).
- [x] Status set by mistake: "Anulează ultimul pas" with a required reason. `undoLastStatus()` marks the step undone (`StatusEvent.undoneAt/undoneById/undoReason`) and returns the order to the step before; repeatable, never the first step. Undone steps show crossed out in the office history and are left out of stats, attempt counts, the courier day, the courier app and public tracking.
- [x] Details: "Editează comanda" works in every status; changed fields are logged. A delivered order cannot ask for more COD than was collected.
- History: new `ShipmentChange` table (kinds DETAILS, PAYMENT_EDITED, PAYMENT_DELETED; ids stored as names), migration `20261121220839_corrections`.

## Phase 3 — Clients & recipients
- [x] Public tracking page (built early, see design pass)
- [ ] Client portal, COD payouts & monthly statements, Telegram + Viber notifications, SMS later

## Phase 4 — Deploy
- [ ] VPS, Docker Compose, Caddy HTTPS, backups

## Open items / waiting on owner
- Google Cloud service account JSON (needed for the Sheets sync).
- Local DB runs in Docker (`docker compose up -d db`). `npm run dev` applies pending migrations first (`predev`), so Claude can migrate by restarting the preview server; the first-time seed (`npm run db:setup`) must run from a normal terminal (the Claude sandbox can't reach local ports or the Docker socket).
- Phone testing on the office Wi-Fi: http://<Mac IP>:3000/courier (dev server prints the Network URL).
- Google Sheets sync is not yet tested against a real sheet (needs the service account).
- Local DB contains demo data (Demo Shop SRL, Demo Print Agency, couriers Ion/Vasile, 3 test shipments). Reset with `npx prisma migrate reset` before real use.
- Label + tracking page phone number: set `COMPANY_PHONE` in `.env`.
- Set `PUBLIC_URL` to the real TMS domain when deployed (label QR codes use it; locally it falls back to the request host).
- List of localities per zone (seeded with a starter list; owner can extend it in settings).

## Log
- 2026-11-16: Requirements gathered, plan approved, prices confirmed (60/70/90 MDL + 4 MDL/kg over 5 kg). Scaffolding started.
- 2026-11-16: Phase 1 code written. Decisions during build: labels are an HTML print page instead of pdf-lib (pdf-lib standard fonts can't render ș/ț or Cyrillic); auth is a small jose+bcrypt cookie session instead of Auth.js; locale is stored in a cookie (no /ro /ru /en URL prefixes); weights stored in grams, money in bani. Unknown localities leave the zone empty and the dashboard flags them.
- 2026-11-17: Local Postgres via Docker; initial migration `20261116000000_init`. Browser verification done; fixed: empty COD/weight rejected as invalid, field widths in filter/bulk bars, dates now shown in Europe/Chisinau time.
- 2026-11-17: Phase 2 courier app built and verified. Decisions: delivery requires receiver name + photo or signature; couriers can't set CONFIRMED/CANCELLED; only cash (not card/transfer) is handed over, and the office confirms it; uploads stored on disk in UPLOAD_DIR, served only to logged-in staff via /api/files.
- 2026-11-17: Design/usability pass (see section above). Fixed: signature pad could drop a stroke when pointer capture failed; label QR pointed at a page that didn't exist.
- 2026-11-17: Redesign pass (see section above). Decisions: brand follows cn-deliveries.com blue with a new parcel mark; statuses keep distinct colours but one badge style; office toasts bottom-right, courier toasts top; sidebar becomes a drawer below 1280px so the shipments table always fits; added `sonner`, `vaul`, `@fontsource-variable/onest`, `@fontsource-variable/jetbrains-mono`.
