import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { normalizeLocality } from "../src/lib/text";

try {
  process.loadEnvFile(".env");
} catch {}

const db = new PrismaClient();

const ZONES = [
  {
    code: "CHISINAU", nameRo: "Chișinău", nameRu: "Кишинёв", nameEn: "Chișinău", basePrice: 6000, sortOrder: 1,
    localities: ["Chișinău", "Botanica", "Buiucani", "Centru", "Ciocana", "Râșcani", "Telecentru", "Poșta Veche", "Sculeni", "Aeroport"],
  },
  {
    code: "SUBURBS", nameRo: "Suburbii", nameRu: "Пригороды", nameEn: "Suburbs", basePrice: 7000, sortOrder: 2,
    localities: [
      "Durlești", "Codru", "Sîngera", "Sângera", "Vatra", "Cricova", "Stăuceni", "Ciorescu", "Grătiești", "Băcioi", "Bubuieci", "Budești",
      "Colonița", "Cruzești", "Tohatin", "Trușeni", "Ghidighici", "Condrița", "Revaca", "Dobrogea", "Goianul Nou", "Frumușica", "Brăila",
      "Bîc", "Dumbrava", "Tunari", "Humulești", "Faureşti", "Buneţi", "Cheltuitori",
    ],
  },
  {
    code: "MOLDOVA", nameRo: "Restul Moldovei", nameRu: "Остальная Молдова", nameEn: "Rest of Moldova", basePrice: 9000, sortOrder: 3,
    localities: [
      "Bălți", "Orhei", "Ungheni", "Cahul", "Soroca", "Comrat", "Hîncești", "Strășeni", "Ialoveni", "Anenii Noi", "Criuleni", "Edineț",
      "Florești", "Căușeni", "Drochia", "Rîșcani", "Fălești", "Sîngerei", "Nisporeni", "Călărași", "Telenești", "Rezina", "Șoldănești",
      "Dondușeni", "Ocnița", "Briceni", "Glodeni", "Leova", "Cimișlia", "Basarabeasca", "Ștefan Vodă", "Cantemir", "Taraclia", "Ceadîr-Lunga",
      "Vulcănești", "Dubăsari", "Codreanca", "Peresecina", "Bardar", "Costești", "Vadul lui Vodă",
    ],
  },
];

async function main() {
  for (const z of ZONES) {
    const { localities, ...data } = z;
    const zone = await db.zone.upsert({ where: { code: z.code }, create: { ...data, includedKg: 5, extraPerKg: 400 }, update: {} });
    for (const name of localities) {
      const key = normalizeLocality(name);
      await db.locality.upsert({ where: { key }, create: { key, name, zoneId: zone.id }, update: {} });
    }
  }

  const email = (process.env.ADMIN_EMAIL ?? "admin@cn-deliveries.com").toLowerCase();
  const exists = await db.user.findUnique({ where: { email } });
  if (!exists) {
    await db.user.create({
      data: { email, name: "Administrator", role: "ADMIN", passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "admin123", 10) },
    });
    console.log(`Admin created: ${email} / ${process.env.ADMIN_PASSWORD ?? "admin123"} (change it after first login)`);
  }

  if (process.argv.includes("--demo")) {
    const pw = await bcrypt.hash("courier123", 10);
    for (const [name, mail] of [["Ion Curier", "ion@cn-deliveries.com"], ["Vasile Curier", "vasile@cn-deliveries.com"]]) {
      await db.user.upsert({ where: { email: mail }, create: { email: mail, name, role: "COURIER", passwordHash: pw, phone: "+373 69 000 000" }, update: {} });
    }
    if (!(await db.client.findFirst({ where: { name: "Demo Shop SRL" } }))) {
      await db.client.create({
        data: { name: "Demo Shop SRL", contactName: "Ana", phone: "+373 22 000 000", address: "str. Ismail 1, Chișinău", feeMode: "DEDUCT_FROM_COD" },
      });
      await db.client.create({ data: { name: "Demo Print Agency", contactName: "Mihai", phone: "+373 22 111 111", address: "bd. Dacia 10, Chișinău", feeMode: "INVOICE" } });
    }
    console.log("Demo couriers (password courier123) and demo clients added.");
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
