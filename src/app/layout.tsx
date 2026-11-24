import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { getDesign } from "@/lib/design.server";
import { DESIGN_META } from "@/lib/design";
// The company typeface (as on cn-deliveries.com) for every design; the others remain for their monospace figures.
import "@fontsource-variable/dm-sans";
// One typeface family per design; a font file is only downloaded when its design is the one on screen.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource-variable/source-sans-3";
import "@fontsource-variable/source-code-pro";
import "@fontsource-variable/sofia-sans";
import "@fontsource-variable/sofia-sans-condensed";
import "@fontsource-variable/wix-madefor-text";
import "@fontsource-variable/geologica";
import "@fontsource-variable/onest";
import "@fontsource-variable/golos-text";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/inter/opsz.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/roboto-flex/full.css";
import "./globals.css";

export const metadata: Metadata = { title: { default: "CN Deliveries", template: "%s · CN Deliveries" } };

export async function generateViewport(): Promise<Viewport> {
  const design = await getDesign();
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: DESIGN_META[design].statusBar };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const design = await getDesign();
  return (
    <html lang={locale} data-design={design}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Toaster position="top-center" duration={4000} offset={16} mobileOffset={{ top: "max(12px, env(safe-area-inset-top))" }} />
      </body>
    </html>
  );
}
