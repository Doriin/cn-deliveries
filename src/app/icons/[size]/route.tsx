import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/Logo";

const SIZES = [180, 192, 512];

/** Home-screen icons. Full-bleed so iOS and Android can apply their own corner shape (maskable). */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  const size = SIZES.includes(n) ? n : 192;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <LogoMark size={size} bleed fixed />
      </div>
    ),
    { width: size, height: size },
  );
}
