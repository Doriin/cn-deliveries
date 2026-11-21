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
- [x] "Azi" day screen per design in `src/components/day/<Design>.tsx` + `src/app/designs/day-<id>.css`, all fed by one loader `src/lib/day.ts` (`loadDay()`); real actions via `src/components/day/shared.tsx`.
- [x] Courier app follows the design (`src/app/designs/courier.css`, `src/lib/courierDay.ts`).
- When the owner chooses: delete the other designs' token blocks, day screens and CSS files, the `design` cookie/action/settings page, and `public/drafts/`.
- Gotchas: design CSS lives in `@layer components` so utilities can still override; shadows are inlined in Tailwind utilities, so `.shadow-card` is restated per design in `tokens.css`; a client module's non-component exports are not readable from server components (menu icons live in `src/components/navIcons.ts` for that reason).

## Second round of designs (2026-11-17)
The owner asked for designs that feel like a professional design studio's work, with real motion ("wow", iOS-level polish).
- [x] Built Insula, Flux and Folio. Verdict: Insula (iOS 26) kept; Flux (Swiss poster) and Folio (newspaper/ledger) rejected and deleted. Never propose those two styles again.
- [x] Built three more: Radar (live radar map of the day around the depot, floating dock), Triaj (keyboard-first inbox with detail pane, ⌘K, G+letter jumps, N for new shipment), Val (Material 3 Expressive: navigation rail with FAB, wavy progress, shape morphing).
- Ids `insula`, `radar`, `triaj`, `val` in `src/lib/design.ts` (`NEW_DESIGNS`), shells `island` / `dock` / `inbox` / `navrail` in `OfficeShell.tsx`, Today screens in `src/components/day/{Insula,Radar,Triaj,Val}.tsx`, styles in `src/app/designs/{insula,radar,triaj,val}.css` (shell, Today, courier app), tokens in `tokens.css`.
- Each design has its own icon family (`src/components/navIconSets.tsx`): Phosphor (Insula), Tabler (Radar), Remix line (Triaj), Material Symbols via Iconify (Val). This departs from the lucide-only rule, at the owner's request for new icons; the rest of the app still uses lucide.
- Radar places parcels with approximate coordinates of Moldovan localities and Chișinău sectors (`src/lib/geo.ts`); unknown places are listed under the map.
- Insula's Dynamic Island loads the day (`loadDay()`) in the office layout on every page, only when Insula is on (`src/lib/pulse.ts`).
- Settings → Design is now a showroom: the new designs as live previews of the real app (`?__design=<id>`, read by the middleware into a request header), switching plays a circular View Transition; older drafts are folded away.
- A second dev server can use its own build folder: `NEXT_DIST_DIR=.next-alt` (two servers sharing `.next` corrupt each other's manifests).
- Not verified: real phone, Safari/Firefox (View Transitions and scroll-driven animations are progressive enhancements there).

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
