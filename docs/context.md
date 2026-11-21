# CN Deliveries TMS — Business context & decisions

Source of truth for any AI agent or developer joining the project. Keep it updated when decisions change.

## The company
- **CN Deliveries** — https://cn-deliveries.com/ — courier/delivery company based in **Chișinău, Moldova**.
- Customers: e-shops, physical stores, individuals, marketing/print agencies that deliver printed materials to businesses, and other companies that send parcels or documents.
- Currency: **MDL (lei)**.
- Current size: **< 50 parcels/day, 1–3 couriers**.

## What we are building
A small, in-house **TMS (Transport Management System)**, started on localhost and later deployed to a cheap VPS.
Clients currently place orders in **Google Sheets — one sheet per client**. The TMS imports those rows automatically and writes back the tracking number and status.

## Users (all four planned, built in phases)
1. **Office / dispatchers**: enter orders, assign couriers, update statuses, record COD, print labels.
2. **Couriers** (phone, PWA): daily route, scan QR, mark delivered/failed, capture proof + COD.
3. **Clients** (portal): create and track their orders, see statements.
4. **Recipients**: public tracking page by tracking number.

## UI languages
**Romanian (default), Russian, English** — every UI string goes through `messages/{ro,ru,en}.json`.

## Delivery statuses (agreed: "full set")
Main flow: `NEW → CONFIRMED → PICKED_UP → AT_WAREHOUSE → OUT_FOR_DELIVERY → DELIVERED`
Exceptions:
- `FAILED_ATTEMPT` with reason (no answer, recipient absent, wrong address, no money, other) → back to warehouse / out for delivery again
- `POSTPONED` (recipient asked for another date)
- `ON_HOLD` / Blocked with reason (damaged, address unclear, unpaid, other)
- `REFUSED` → `RETURNING` → `RETURNED` (back to sender)
- `CANCELLED` (only before pickup)

Reasons are stored separately from the status. Every status change is recorded as a `StatusEvent`. The allowed transitions live in `src/lib/status.ts`.

## Money
- **COD (cash on delivery / ramburs) is common**: couriers collect the parcel value from the recipient for the client, and CN Deliveries pays it back to the client.
- COD payment methods a courier can record:
  - cash with fiscal receipt (store the receipt number)
  - cash without receipt
  - card (POS terminal)
  - bank transfer / MIA instant payment
- **Delivery fee payment**: either a **monthly invoice** to the client, or **deducted from the COD** before paying the client.
- A shipment with COD > 0 cannot be marked DELIVERED without a recorded COD payment.

## Pricing (confirmed by owner)
| Zone | Base price |
|---|---|
| Chișinău | **60 MDL** |
| Suburbs (Chișinău suburbs) | **70 MDL** |
| Rest of Moldova | **90 MDL** |

Plus **4 MDL for each kg above 5 kg** (round partial kg up). Formula:
`fee = (clientOverride ?? zone.basePrice) + max(0, ceil(weightKg − 5)) × 4`
Zones and prices are editable in settings, and individual clients can have their own price per zone.

## Courier app (phase 2, built)
- Mobile web app at `/courier`, installable on the phone home screen.
- Proof of delivery: receiver name **plus** a photo or an on-screen signature (at least one).
- Couriers set only field statuses (picked up, at warehouse, out for delivery, delivered, failed attempt, postponed, on hold, refused, returning, returned). Confirming and cancelling are office-only.
- Cash handover: the courier sees cash in hand; the office confirms receipt on the COD page. Card and transfer payments go straight to the bank and are not handed over.

## Labels
100×150 mm label with barcode + QR (tracking number, recipient, phone, address, COD amount). Also a daily courier manifest.

## Public tracking (built)
`/track/<tracking no.>`, opened from the label QR code. Deliberately shows no recipient name, phone or street because tracking numbers are sequential and guessable.

## Out of scope on purpose
Live driver map, route optimization and auto-dispatch: competitors have them, but they are overkill for 1–3 couriers and < 50 parcels/day. Revisit if volume grows.

## Notifications (phase 3)
Telegram (free bot; recipient subscribes from the tracking link) and Viber (paid per message through a provider). SMS later.

## Hosting
- Now: localhost on the owner's Mac.
- Later: a cheap VPS (e.g. Hetzner CX22, 2 vCPU / 4 GB, ~€5/mo) with Docker Compose + Caddy HTTPS + daily DB backups. That's far more than this volume needs. Scale by resizing the VPS or moving to managed Postgres.

## Phases
1. **Office** — orders, statuses, couriers, zones/pricing, COD, labels/manifest, Google Sheets sync, dashboard.
2. **Courier PWA** — `/courier`.
3. **Client portal + public tracking + COD payouts/statements + Telegram/Viber notifications.**
4. **Deploy** to the VPS.

See `docs/progress.md` for the current state.
