import cron from "node-cron";

try {
  process.loadEnvFile(".env");
} catch {
  // env comes from the environment (Docker)
}

async function main() {
  // Imported after the env is loaded so Prisma picks up DATABASE_URL.
  const { syncAll, sheetsConfigured } = await import("./sheets/sync");
  const minutes = Math.max(1, Number(process.env.SHEETS_SYNC_MINUTES ?? 2));
  let running = false;

  async function tick() {
    if (running) return;
    if (!sheetsConfigured()) {
      console.warn("[sheets] GOOGLE_SERVICE_ACCOUNT_JSON missing, skipping sync");
      return;
    }
    running = true;
    try {
      await syncAll();
    } catch (e) {
      console.error("[sheets] sync failed", e);
    } finally {
      running = false;
    }
  }

  console.log(`[worker] Google Sheets sync every ${minutes} min`);
  cron.schedule(`*/${minutes} * * * *`, tick);
  void tick();
}

void main();
