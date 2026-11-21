import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // A second local dev server (e.g. a preview on another port) needs its own build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["bwip-js", "googleapis"],
  // Delivery photos + signatures are sent through server actions.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // Icon packs used by the nav designs; without this every page pulls in the whole pack.
    optimizePackageImports: ["@phosphor-icons/react", "@remixicon/react"],
  },
  // Lets couriers test the app from a phone on the office Wi-Fi during development.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  // Design drafts are static pages in public/drafts; this makes /drafts open their index.
  async redirects() {
    return [{ source: "/drafts", destination: "/drafts/index.html", permanent: false }];
  },
};

export default withNextIntl(nextConfig);
