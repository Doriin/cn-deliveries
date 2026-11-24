import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import bcrypt from "bcryptjs";
import type { FeeMode, PaymentMethod, ShipmentStatus, ShipmentType } from "@prisma/client";

try {
  process.loadEnvFile(".env");
} catch {}

/** Mock data for local work: `npm run seed:mock` (add `-- --reset` to replace an earlier run, `--seed <n>` to repeat one). */

const DAYS_BACK = 120;
const seedAt = process.argv.indexOf("--seed");
const SEED = seedAt > 0 ? Number(process.argv[seedAt + 1]) : Math.floor(Math.random() * 1_000_000);
if (!Number.isInteger(SEED)) throw new Error("--seed needs a whole number, e.g. --seed 4821");

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = mulberry32(SEED);
const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const num = (a: number, b: number) => a + r() * (b - a);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
const chance = (p: number) => r() < p;
function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1]![0];
}

// ---------- calendar (Moldova days as YYYY-MM-DD) ----------
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
const nextWorkDay = (day: string) => {
  let d = addDays(day, 1);
  while (weekday(d) === 0) d = addDays(d, 1);
  return d;
};
const dateOnly = (day: string) => new Date(`${day}T00:00:00Z`);
const MIN = 60000;

// ---------- reference data ----------
const FIRST_M = ["Ion", "Vasile", "Andrei", "Mihai", "Alexandru", "Dumitru", "Sergiu", "Victor", "Nicolae", "Radu", "Cristian", "Vlad", "Eugen", "Maxim", "Valeriu", "Gheorghe", "Petru", "Iurie", "Octavian", "Marcel"];
const FIRST_F = ["Maria", "Elena", "Ana", "Natalia", "Tatiana", "Irina", "Cristina", "Diana", "Ludmila", "Valentina", "Ecaterina", "Daniela", "Alina", "Victoria", "Mariana", "Corina", "Doina", "Lilia", "Veronica", "Aurelia"];
const LAST = ["Rusu", "Ceban", "Popescu", "Munteanu", "Lungu", "Cojocaru", "Ciobanu", "Rotaru", "Moraru", "Botnaru", "Țurcanu", "Melnic", "Sârbu", "Guțu", "Cazacu", "Bălan", "Croitoru", "Postolache", "Railean", "Spînu", "Bivol", "Covalciuc", "Gheorghiu", "Plămădeală", "Ursu", "Bodrug", "Lupașcu", "Grosu", "Țâcu", "Prodan"];
const RU_M = ["Dmitri", "Serghei", "Pavel", "Oleg", "Igor", "Artiom", "Denis", "Roman"];
const RU_F = ["Svetlana", "Olga", "Galina", "Inna", "Larisa", "Iulia", "Oxana", "Marina"];
const RU_LAST: [string, string][] = [["Ivanov", "Ivanova"], ["Petrov", "Petrova"], ["Smirnov", "Smirnova"], ["Kozlov", "Kozlova"], ["Volkov", "Volkova"], ["Novac", "Novac"], ["Kovalenko", "Kovalenko"], ["Sîrbu", "Sîrbu"]];

function personName(): string {
  if (chance(0.22)) {
    const f = chance(0.5);
    const [m, w] = pick(RU_LAST);
    return `${pick(f ? RU_F : RU_M)} ${f ? w : m}`;
  }
  return `${pick(chance(0.5) ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
}

const STREETS_CITY = [
  "str. Ștefan cel Mare", "bd. Dacia", "str. Mihai Viteazul", "str. Alba Iulia", "bd. Moscova", "str. Ion Creangă", "bd. Traian", "str. Independenței",
  "str. Calea Ieșilor", "str. Mircea cel Bătrân", "str. Grenoble", "str. Cuza Vodă", "bd. Decebal", "str. Pușkin", "str. 31 August 1989", "str. București",
  "str. Vasile Alecsandri", "str. Armenească", "str. Columna", "str. Bănulescu-Bodoni", "str. Sarmizegetusa", "bd. Renașterii Naționale", "str. Petru Rareș",
  "str. Kiev", "str. Bogdan Voievod", "str. Studenților", "str. Teilor", "str. Nicolae Zelinski", "str. Ismail", "str. Vadul lui Vodă",
];
const STREETS_TOWN = ["str. Centrală", "str. Ștefan cel Mare", "str. Mihai Eminescu", "str. Păcii", "str. Gării", "str. Livezilor", "str. Independenței", "str. Școlii", "str. Trandafirilor", "str. Tineretului", "str. Viilor", "str. Alexandru cel Bun"];

function cityAddress(): string {
  const n = `${int(1, 140)}${chance(0.2) ? `/${int(1, 4)}` : ""}`;
  const ap = chance(0.7) ? `, ap. ${int(1, 160)}` : "";
  return `${pick(STREETS_CITY)} ${n}${ap}`;
}
const townAddress = () => `${pick(STREETS_TOWN)} ${int(1, 90)}${chance(0.15) ? `, ap. ${int(1, 40)}` : ""}`;

function mobilePhone(normalize: (s: string) => string): string {
  const prefix = pick(["60", "62", "67", "68", "69", "69", "78", "79", "79", "76"]);
  return normalize(`0${prefix}${String(int(0, 999999)).padStart(6, "0")}`);
}

const CITY_GENERIC = "Chișinău";
const ROUTE_ION = ["Centru", "Buiucani", "Botanica", "Telecentru", "Aeroport"];
const ROUTE_VASILE = ["Ciocana", "Râșcani", "Poșta Veche", "Sculeni"];
const SUBURBS = ["Durlești", "Codru", "Sîngera", "Vatra", "Cricova", "Stăuceni", "Ciorescu", "Grătiești", "Băcioi", "Bubuieci", "Budești", "Colonița", "Ghidighici", "Trușeni", "Tohatin", "Dumbrava"];
const REGIONS = ["Bălți", "Orhei", "Ungheni", "Cahul", "Soroca", "Comrat", "Hîncești", "Strășeni", "Ialoveni", "Anenii Noi", "Criuleni", "Edineț", "Florești", "Căușeni", "Drochia", "Nisporeni", "Călărași", "Rezina", "Cimișlia", "Ștefan Vodă"];

const NOTES = [
  "Sunați cu 30 de minute înainte",
  "Interfonul nu funcționează, sunați la sosire",
  "Livrare după ora 14:00",
  "Etajul 7, liftul nu merge",
  "Lăsați la paznic dacă nu răspunde",
  "Позвонить заранее",
  "Код домофона 45К",
  "Doar în zilele lucrătoare",
  "Fragil, manipulați cu grijă",
  "Clientul plătește doar cu cardul",
  "Intrarea din spatele blocului",
];

type MockClient = {
  name: string; contactName: string; phone: string; email: string; address: string; feeMode: FeeMode;
  weight: number; cod: [number, number]; noCod: number; grams: [number, number]; contents: string[];
  type?: ShipmentType; cityOnly?: number; sameDay?: boolean; prices?: Partial<Record<"CHISINAU" | "SUBURBS" | "MOLDOVA", number>>; notes?: string;
};

const MOCK_CLIENTS: MockClient[] = [
  { name: "TechPoint SRL", contactName: "Alexandru Lungu", phone: "022 830 410", email: "comenzi@techpoint.md", address: "bd. Dacia 47, Chișinău", feeMode: "DEDUCT_FROM_COD",
    weight: 18, cod: [600, 14000], noCod: 0.05, grams: [300, 6000], prices: { CHISINAU: 5000, SUBURBS: 6000 }, notes: "Client mare, tarif negociat pe 2026.",
    contents: ["Smartphone Samsung Galaxy A55", "Căști Sony WH-1000XM5", "Laptop Lenovo IdeaPad 5", "Tabletă Xiaomi Pad 6", "Router TP-Link Archer", "Smartwatch Huawei GT 4", "Aspirator robot Xiaomi", "Monitor LG 27\"", "Boxă JBL Flip 6"] },
  { name: "Floria Flori & Cadouri", contactName: "Doina Ursu", phone: "069 410 222", email: "salut@floria.md", address: "str. Pușkin 22, Chișinău", feeMode: "DEDUCT_FROM_COD",
    weight: 10, cod: [350, 1800], noCod: 0.1, grams: [500, 3000], cityOnly: 0.9, sameDay: true,
    contents: ["Buchet 25 trandafiri", "Aranjament floral în cutie", "Coș cadou", "Orhidee în ghiveci", "Buchet de bujori", "Tort și flori"] },
  { name: "Casa Verde SRL", contactName: "Natalia Cojocaru", phone: "022 556 701", email: "office@casaverde.md", address: "str. Calea Ieșilor 10, Chișinău", feeMode: "INVOICE",
    weight: 12, cod: [200, 4500], noCod: 0.2, grams: [1000, 15000],
    contents: ["Set oale inox 8 piese", "Lenjerie de pat 2 persoane", "Lampă de birou LED", "Set prosoape bumbac", "Covor 120×170", "Espressor DeLonghi", "Set tacâmuri 24 piese"] },
  { name: "Librăria Alfa", contactName: "Victor Botnaru", phone: "022 274 918", email: "librarie@alfa-carte.md", address: "str. 31 August 1989 78, Chișinău", feeMode: "INVOICE",
    weight: 9, cod: [120, 900], noCod: 0.25, grams: [300, 3000],
    contents: ["Cărți (3 buc.)", "Manuale școlare clasa a V-a", "Set rechizite", "Carte pentru copii", "Joc de societate", "Enciclopedie ilustrată"] },
  { name: "Kids Planet", contactName: "Cristina Rotaru", phone: "060 118 455", email: "shop@kidsplanet.md", address: "bd. Moscova 15, Chișinău", feeMode: "DEDUCT_FROM_COD",
    weight: 10, cod: [250, 3000], noCod: 0.05, grams: [400, 8000],
    contents: ["LEGO City", "Păpușă cu accesorii", "Mașinuță teleghidată", "Puzzle 1000 piese", "Trotinetă copii", "Set creativ pictură"] },
  { name: "Bella Cosmetics", contactName: "Irina Gheorghiu", phone: "079 203 774", email: "comenzi@bellacosmetics.md", address: "str. Armenească 33, Chișinău", feeMode: "DEDUCT_FROM_COD",
    weight: 12, cod: [180, 1500], noCod: 0.05, grams: [200, 1500], prices: { CHISINAU: 5500 },
    contents: ["Set cosmetice îngrijire", "Parfum 50 ml", "Cremă de față", "Paletă farduri", "Șampon profesional", "Ser vitamina C"] },
  { name: "SportLine MD", contactName: "Radu Cazacu", phone: "068 990 120", email: "info@sportline.md", address: "str. Ismail 88, Chișinău", feeMode: "INVOICE",
    weight: 9, cod: [300, 6000], noCod: 0.2, grams: [500, 16000],
    contents: ["Adidași de alergare", "Geacă sport", "Gantere 2×5 kg", "Covoraș yoga", "Bicicletă (cutie)", "Rucsac tură 30 L", "Minge de fotbal"] },
  { name: "Biroul Notarial Popescu", contactName: "Elena Popescu", phone: "022 233 612", email: "notar.popescu@mail.md", address: "str. Bănulescu-Bodoni 45, Chișinău", feeMode: "INVOICE",
    weight: 4, cod: [0, 0], noCod: 1, grams: [100, 500], type: "DOCUMENTS", cityOnly: 0.7,
    contents: ["Contract de vânzare-cumpărare", "Acte notariale", "Procură", "Documente originale"] },
  { name: "Optica Vision", contactName: "Marcel Grosu", phone: "078 455 300", email: "vision@optica.md", address: "bd. Traian 9, Chișinău", feeMode: "DEDUCT_FROM_COD",
    weight: 6, cod: [400, 3500], noCod: 0.1, grams: [100, 600],
    contents: ["Ochelari de vedere", "Lentile de contact (3 luni)", "Ochelari de soare", "Rame și lentile"] },
  { name: "Bio Market", contactName: "Lilia Prodan", phone: "069 700 515", email: "comenzi@biomarket.md", address: "str. Kiev 7, Chișinău", feeMode: "INVOICE",
    weight: 10, cod: [150, 1200], noCod: 0.2, grams: [1000, 9000],
    contents: ["Produse eco", "Ceai și cafea de specialitate", "Miere naturală 1 kg", "Set fructe uscate", "Ulei presat la rece", "Coș produse locale"] },
];

const FAIL_NOTES: Record<string, string[]> = {
  NO_ANSWER: ["Nu răspunde la telefon", "Am sunat de 3 ori, fără răspuns"],
  ABSENT: ["Nu este acasă, revin mâine", "Vecinii spun că e la serviciu"],
  WRONG_ADDRESS: ["Adresa nu există", "Blocul nu are apartamentul indicat"],
  NO_MONEY: ["Nu are suma necesară, cere revenire mâine"],
};
const RECEIVERS = ["Soțul", "Soția", "Mama", "Vecina", "Colegul de birou", "Paznicul", "Fiul", "Fiica"];

// ---------- signature images (proof of delivery) ----------
function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w: number, h: number, rgba: Buffer): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", ihdr), pngChunk("IDAT", zlib.deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}
function signaturePng(seed: number): Buffer {
  const w = 360, h = 140;
  const px = Buffer.alloc(w * h * 4);
  const rr = mulberry32(seed);
  const dot = (x: number, y: number) => {
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const X = Math.round(x + dx), Y = Math.round(y + dy);
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
        const a = Math.max(0, Math.min(1, 2.1 - Math.hypot(X - x, Y - y))) * 255;
        const i = (Y * w + X) * 4;
        if (a > px[i + 3]!) {
          px[i] = 28; px[i + 1] = 48; px[i + 2] = 120; px[i + 3] = a;
        }
      }
  };
  const loops = 5 + Math.floor(rr() * 4), p1 = rr() * 6, p2 = rr() * 6, amp = 16 + rr() * 14, loopR = 9 + rr() * 8;
  for (let i = 0; i <= 4000; i++) {
    const t = i / 4000;
    const x = 28 + t * (w - 80) + loopR * Math.cos(2 * Math.PI * loops * t + p1);
    const y = h / 2 - 6 + amp * Math.sin(2 * Math.PI * 1.2 * t + p2) * (1 - 0.5 * t) + loopR * 1.4 * Math.sin(2 * Math.PI * loops * t + p1);
    dot(x, y);
  }
  for (let i = 0; i <= 1200; i++) {
    const t = i / 1200;
    dot(w * 0.45 + t * (w * 0.5), h - 28 + 5 * Math.sin(t * 5 + p1) - t * 10);
  }
  return encodePng(w, h, px);
}

// ---------- lifecycle ----------
type Ev = { to: ShipmentStatus; at: Date; userId: string | null; reason?: string | null; note?: string | null; receivedBy?: string | null; signaturePath?: string | null; newDate?: Date | null };
type Pay = { amount: number; method: PaymentMethod; receiptNo: string | null; at: Date; courierId: string };

async function main() {
  const { db } = await import("../src/lib/db");
  const { feeFor, resolveZoneId } = await import("../src/lib/shipments");
  const { validateTransition } = await import("../src/lib/status");
  const { nextTrackingNo } = await import("../src/lib/tracking");
  const { dayBounds, todayMD } = await import("../src/lib/dates");
  const { normalizePhone } = await import("../src/lib/text");

  const at = (day: string, hour: number) => new Date(dayBounds(day).start.getTime() + hour * 3600000);
  const TODAY = todayMD();
  const realHour = (Date.now() - dayBounds(TODAY).start.getTime()) / 3600000;
  // Outside working hours the "live" day is drawn as it looks at 13:30, so the today screens are never empty.
  const NOW = realHour >= 10 && realHour <= 18 ? new Date() : at(TODAY, 13.5);
  const nowHour = (NOW.getTime() - dayBounds(TODAY).start.getTime()) / 3600000;

  if ((await db.zone.count()) === 0) throw new Error("No zones found. Run `npm run db:setup` first.");
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@cn-deliveries.com").toLowerCase();
  const admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) throw new Error("Admin user missing. Run `npm run db:setup` first.");

  const existing = await db.client.findMany({ where: { name: { in: MOCK_CLIENTS.map((c) => c.name) } }, select: { id: true } });
  if (existing.length) {
    if (!process.argv.includes("--reset")) {
      console.log("Mock data is already in the database. Run `npm run seed:mock -- --reset` to replace it.");
      return;
    }
    const ids = existing.map((c) => c.id);
    const del = await db.shipment.deleteMany({ where: { clientId: { in: ids } } });
    await db.cashHandover.deleteMany({ where: { payments: { none: {} } } });
    await db.client.deleteMany({ where: { id: { in: ids } } });
    console.log(`Removed earlier mock data (${del.count} shipments).`);
  }

  // users
  const courierPw = await bcrypt.hash("courier123", 10);
  const upsertUser = (email: string, name: string, role: "COURIER" | "DISPATCHER", phone: string, passwordHash: string) =>
    db.user.upsert({ where: { email }, create: { email, name, role, phone, passwordHash }, update: {} });
  const ion = await upsertUser("ion@cn-deliveries.com", "Ion Curier", "COURIER", "+373 69 000 000", courierPw);
  const vasile = await upsertUser("vasile@cn-deliveries.com", "Vasile Curier", "COURIER", "+373 69 000 000", courierPw);
  const andrei = await upsertUser("andrei@cn-deliveries.com", "Andrei Moraru", "COURIER", "+373 69 214 557", courierPw);
  const sergiu = await upsertUser("sergiu@cn-deliveries.com", "Sergiu Ceban", "COURIER", "+373 79 330 812", courierPw);
  const elena = await upsertUser("elena@cn-deliveries.com", "Elena Rotaru", "DISPATCHER", "+373 68 502 119", await bcrypt.hash("dispatcher123", 10));
  const office = () => (chance(0.7) ? elena.id : admin.id);

  // signatures
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  fs.mkdirSync(path.join(uploadRoot, "mock"), { recursive: true });
  const SIGS = Array.from({ length: 8 }, (_, i) => {
    const rel = `mock/signature-${i + 1}.png`;
    fs.writeFileSync(path.join(uploadRoot, rel), signaturePng(SEED + i * 97));
    return rel;
  });

  // clients
  const zones = await db.zone.findMany();
  const zoneId = (code: string) => zones.find((z) => z.code === code)!.id;
  const clients = [];
  for (const c of MOCK_CLIENTS) {
    const row = await db.client.create({
      data: {
        name: c.name, contactName: c.contactName, phone: normalizePhone(c.phone), email: c.email, address: c.address, feeMode: c.feeMode, notes: c.notes ?? null,
        fiscalCode: `1003600${String(int(100000, 999999))}`,
        iban: `MD${int(10, 99)}AG${String(int(0, 999999999)).padStart(9, "0")}${String(int(0, 999999999)).padStart(9, "0")}`,
        createdAt: at(addDays(TODAY, -DAYS_BACK - int(5, 60)), 10),
        prices: c.prices ? { create: Object.entries(c.prices).map(([code, price]) => ({ zoneId: zoneId(code), price: price! })) } : undefined,
      },
    });
    clients.push({ ...c, id: row.id });
  }

  type Draft = { day: string; created: Date; client: (typeof clients)[number]; unassigned?: boolean; stayNew?: boolean; locality?: string };
  const drafts: Draft[] = [];
  for (let off = -DAYS_BACK; off <= 0; off++) {
    const day = addDays(TODAY, off);
    const wd = weekday(day);
    const count = off === 0 ? int(24, 30) : wd === 0 ? int(0, 2) : wd === 6 ? int(8, 12) : int(30, 42);
    const [h0, h1] = off === 0 ? [7.5, Math.max(8, nowHour - 0.25)] : [8, 16.8];
    for (let i = 0; i < count; i++) {
      drafts.push({ day, created: at(day, num(h0, h1)), client: weighted(clients.map((c) => [c, c.weight] as const)), unassigned: off === 0 && chance(0.25) });
    }
  }
  // Two parcels today whose village is not in the locality list yet: they show up as "no zone".
  for (const locality of ["Mileștii Mici", "Ruseni"]) {
    drafts.push({ day: TODAY, created: at(TODAY, Math.max(8, nowHour - num(0.3, 1.5))), client: pick(clients), unassigned: true, stayNew: true, locality });
  }
  drafts.sort((a, b) => a.created.getTime() - b.created.getTime());

  let made = 0;
  for (const d of drafts) {
    const c = d.client;
    // where it goes, and who drives that route
    let locality: string;
    let courierId: string;
    let address: string;
    const area = d.locality ? "TOWN" : chance(c.cityOnly ?? 0) ? "CITY" : weighted([["CITY", 60], ["SUBURBS", 20], ["MOLDOVA", 20]] as const);
    if (area === "CITY") {
      const onIon = chance(0.5);
      courierId = onIon ? ion.id : vasile.id;
      locality = chance(0.55) ? CITY_GENERIC : pick(onIon ? ROUTE_ION : ROUTE_VASILE);
      address = cityAddress();
    } else if (area === "SUBURBS") {
      courierId = andrei.id;
      locality = pick(SUBURBS);
      address = townAddress();
    } else if (area === "MOLDOVA") {
      courierId = sergiu.id;
      locality = pick(REGIONS);
      address = townAddress();
    } else {
      courierId = andrei.id;
      locality = d.locality!;
      address = townAddress();
    }
    const assigned = d.unassigned ? null : courierId;

    const grams = c.type === "DOCUMENTS" ? int(c.grams[0], c.grams[1]) : Math.round(int(c.grams[0], c.grams[1]) / 50) * 50;
    let codMdl = 0;
    if (!chance(c.noCod)) {
      codMdl = Math.round(int(c.cod[0], c.cod[1]) / 10) * 10;
      if (chance(0.4)) codMdl -= 1;
    }
    const codAmount = codMdl * 100;
    const recipientName = personName();
    const desiredDay = chance(0.12) ? (() => { let x = addDays(d.day, int(2, 3)); while (weekday(x) === 0) x = addDays(x, 1); return x; })() : null;

    // ----- the parcel's life, step by step -----
    const ev: Ev[] = [{ to: "NEW", at: d.created, userId: office() }];
    const pays: Pay[] = [];
    let t = d.created;
    const step = (e: Omit<Ev, "at">, when: Date) => {
      t = new Date(Math.max(when.getTime(), t.getTime() + int(2, 6) * MIN));
      ev.push({ ...e, at: t });
    };
    const recent = d.day >= addDays(TODAY, -6);

    (() => {
      if (d.stayNew) return;
      if (chance(0.025)) return step({ to: "CANCELLED", userId: office(), note: "Anulat la cererea clientului" }, new Date(t.getTime() + num(1, 4) * 3600000));
      step({ to: "CONFIRMED", userId: office() }, new Date(t.getTime() + int(10, 90) * MIN));
      if (!assigned) return;
      if (chance(0.01)) return step({ to: "CANCELLED", userId: office(), note: "Clientul a renunțat la comandă" }, new Date(t.getTime() + num(1, 3) * 3600000));

      const createdHour = (d.created.getTime() - dayBounds(d.day).start.getTime()) / 3600000;
      const sameDay = !!c.sameDay && area === "CITY" && createdHour < 12 && weekday(d.day) !== 0;
      let workDay: string;
      if (sameDay) {
        workDay = d.day;
        step({ to: "PICKED_UP", userId: courierId }, new Date(t.getTime() + num(0.7, 1.5) * 3600000));
        step({ to: "OUT_FOR_DELIVERY", userId: courierId }, new Date(t.getTime() + int(10, 25) * MIN));
      } else {
        const pickDay = createdHour < 15 && weekday(d.day) !== 0 ? d.day : nextWorkDay(d.day);
        step({ to: "PICKED_UP", userId: courierId }, at(pickDay, pickDay === d.day ? num(14, 17.5) : num(10, 12.5)));
        step({ to: "AT_WAREHOUSE", userId: courierId }, new Date(t.getTime() + num(1, 2.5) * 3600000));
        workDay = nextWorkDay(pickDay);
        if (desiredDay && desiredDay > workDay) workDay = desiredDay;
        step({ to: "OUT_FOR_DELIVERY", userId: courierId }, at(workDay, num(8.75, 9.5)));
      }

      for (let attempt = 1; attempt <= 4; attempt++) {
        const outcomeAt = sameDay && attempt === 1 ? new Date(t.getTime() + num(0.5, 2.5) * 3600000) : at(workDay, num(10, 18));
        const outcome = weighted([
          ["DELIVERED", attempt === 1 ? 84 : 78],
          ["FAILED_ATTEMPT", 8],
          ["REFUSED", 3],
          ["POSTPONED", 3],
          ["ON_HOLD", 2],
        ] as const);
        if (outcome === "DELIVERED") {
          if (codAmount > 0) {
            const method = weighted([["CASH_RECEIPT", 55], ["CASH_NO_RECEIPT", 20], ["CARD", 18], ["TRANSFER", 7]] as const);
            pays.push({ amount: codAmount, method, receiptNo: method === "CASH_RECEIPT" ? String(int(1000, 99999)).padStart(6, "0") : null, at: new Date(outcomeAt.getTime() - MIN), courierId });
          }
          step({ to: "DELIVERED", userId: courierId, receivedBy: chance(0.75) ? recipientName : pick(RECEIVERS), signaturePath: pick(SIGS) }, outcomeAt);
          return;
        }
        if (outcome === "FAILED_ATTEMPT") {
          const reason = weighted([["NO_ANSWER", 50], ["ABSENT", 30], ["WRONG_ADDRESS", 10], ["NO_MONEY", 10]] as const);
          step({ to: "FAILED_ATTEMPT", userId: courierId, reason, note: chance(0.7) ? pick(FAIL_NOTES[reason]!) : null }, outcomeAt);
          if (recent && chance(0.3)) return;
          if (attempt >= 2) {
            const d1 = nextWorkDay(workDay);
            step({ to: "RETURNING", userId: office(), note: "Două încercări nereușite, retur la client" }, at(d1, num(9.5, 11)));
            step({ to: "RETURNED", userId: courierId }, at(nextWorkDay(d1), num(11, 16)));
            return;
          }
          if (chance(0.5)) step({ to: "AT_WAREHOUSE", userId: courierId }, at(workDay, num(18.2, 18.8)));
          workDay = nextWorkDay(workDay);
          step({ to: "OUT_FOR_DELIVERY", userId: courierId }, at(workDay, num(8.75, 9.5)));
          continue;
        }
        if (outcome === "REFUSED") {
          step({ to: "REFUSED", userId: courierId, reason: weighted([["CHANGED_MIND", 50], ["DAMAGED", 15], ["WRONG_ITEM", 25], ["OTHER", 10]] as const), note: chance(0.5) ? "A refuzat la ușă" : null }, outcomeAt);
          if (recent && chance(0.35)) return;
          const d1 = nextWorkDay(workDay);
          step({ to: "RETURNING", userId: office() }, at(d1, num(9.5, 11)));
          step({ to: "RETURNED", userId: courierId }, at(nextWorkDay(d1), num(11, 16)));
          return;
        }
        if (outcome === "POSTPONED") {
          let newDay = nextWorkDay(workDay);
          if (chance(0.5)) newDay = nextWorkDay(newDay);
          step({ to: "POSTPONED", userId: courierId, newDate: dateOnly(newDay), note: "Clientul a cerut altă zi" }, outcomeAt);
          workDay = newDay;
          step({ to: "OUT_FOR_DELIVERY", userId: courierId }, at(workDay, num(8.75, 9.5)));
          continue;
        }
        step({ to: "ON_HOLD", userId: courierId, reason: weighted([["ADDRESS_UNCLEAR", 50], ["CLIENT_REQUEST", 30], ["DAMAGED", 20]] as const), note: chance(0.6) ? "Aștept confirmarea adresei de la client" : null }, outcomeAt);
        if (recent && chance(0.4)) return;
        workDay = nextWorkDay(workDay);
        step({ to: "OUT_FOR_DELIVERY", userId: office() }, at(workDay, num(8.75, 9.5)));
      }
    })();

    // Keep only what has happened by now.
    const events = ev.filter((e) => e.at <= NOW);
    const payments = events.some((e) => e.to === "DELIVERED") ? pays : [];
    let from: ShipmentStatus = "NEW";
    for (const e of events.slice(1)) {
      const paid = payments.filter((p) => p.at <= e.at).reduce((a, p) => a + p.amount, 0);
      const err = validateTransition({ from, to: e.to, reason: e.reason, codAmount, codPaid: paid, newDate: e.newDate });
      if (err) throw new Error(`Mock path ${from} -> ${e.to} rejected: ${err}`);
      from = e.to;
    }
    const last = events[events.length - 1]!;
    const postponed = [...events].reverse().find((e) => e.to === "POSTPONED");
    const zone = await resolveZoneId(locality);
    const deliveryFee = await feeFor(c.id, zone, grams);

    await db.$transaction(async (tx) => {
      const trackingNo = await nextTrackingNo(tx, d.created);
      await tx.shipment.create({
        data: {
          trackingNo,
          clientId: c.id,
          source: "MANUAL",
          recipientName,
          recipientPhone: mobilePhone(normalizePhone),
          recipientAddress: address,
          recipientLocality: locality,
          zoneId: zone,
          weightGrams: grams,
          pieces: c.type === "DOCUMENTS" ? 1 : weighted([[1, 85], [2, 12], [3, 3]] as const),
          type: c.type ?? "PARCEL",
          contents: pick(c.contents),
          codAmount,
          deliveryFee,
          feeMode: c.feeMode,
          desiredDate: postponed?.newDate ?? (desiredDay ? dateOnly(desiredDay) : null),
          notes: chance(0.22) ? pick(NOTES) : null,
          status: last.to,
          statusReason: last.reason ?? null,
          courierId: assigned,
          deliveredAt: last.to === "DELIVERED" ? last.at : null,
          createdAt: d.created,
          updatedAt: last.at,
          events: {
            create: events.map((e, i) => ({
              fromStatus: i === 0 ? null : events[i - 1]!.to,
              toStatus: e.to,
              reason: e.reason ?? null,
              note: e.note ?? null,
              userId: e.userId,
              receivedBy: e.receivedBy ?? null,
              signaturePath: e.signaturePath ?? null,
              createdAt: e.at,
            })),
          },
          codPayments: {
            create: payments.map((p) => ({ amount: p.amount, method: p.method, receiptNo: p.receiptNo, courierId: p.courierId, recordedById: p.courierId, collectedAt: p.at })),
          },
        },
      });
    });
    made++;
    if (made % 100 === 0) console.log(`  ${made}/${drafts.length} shipments`);
  }

  // Couriers hand in each day's cash in the evening; today's cash (and Vasile's from yesterday) is still on them.
  const yesterday = (() => { let x = addDays(TODAY, -1); while (weekday(x) === 0) x = addDays(x, -1); return x; })();
  const cash = await db.codPayment.findMany({
    where: { handoverId: null, method: { in: ["CASH_RECEIPT", "CASH_NO_RECEIPT"] }, shipment: { clientId: { in: clients.map((c) => c.id) } } },
    select: { id: true, amount: true, courierId: true, collectedAt: true },
  });
  const groups = new Map<string, { courierId: string; day: string; ids: string[]; amount: number }>();
  for (const p of cash) {
    if (!p.courierId) continue;
    const day = todayMD(p.collectedAt);
    if (day >= TODAY || (day === yesterday && p.courierId === vasile.id)) continue;
    const key = `${p.courierId}|${day}`;
    const g = groups.get(key) ?? { courierId: p.courierId, day, ids: [], amount: 0 };
    g.ids.push(p.id);
    g.amount += p.amount;
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    await db.$transaction(async (tx) => {
      const h = await tx.cashHandover.create({
        data: { courierId: g.courierId, receivedById: office(), amount: g.amount, note: chance(0.15) ? "Numărat împreună, corect" : null, createdAt: at(g.day, num(18.5, 19.3)) },
      });
      await tx.codPayment.updateMany({ where: { id: { in: g.ids } }, data: { handoverId: h.id } });
    });
  }

  const byStatus = await db.shipment.groupBy({ by: ["status"], where: { clientId: { in: clients.map((c) => c.id) } }, _count: true });
  console.log(`Mock data added: ${clients.length} clients, ${made} shipments, ${groups.size} cash handovers.`);
  console.log(byStatus.map((s) => `  ${s.status}: ${s._count}`).join("\n"));
  if (NOW.getTime() > Date.now()) console.log(`Today's activity is drawn up to ${NOW.toLocaleTimeString("ro-MD", { timeZone: "Europe/Chisinau", hour: "2-digit", minute: "2-digit" })} Moldova time.`);
  console.log("Logins: andrei@ / sergiu@cn-deliveries.com (courier123), elena@cn-deliveries.com (dispatcher123).");
  console.log(`Seed ${SEED}. Same data again: npm run seed:mock -- --reset --seed ${SEED}`);
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
