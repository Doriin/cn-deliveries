import { cookies, headers } from "next/headers";
import { DEFAULT_DESIGN, DESIGN_COOKIE, DESIGN_PREVIEW_HEADER, isDesign, type Design } from "./design";

/** The design chosen on this browser (Settings → Design, or the courier's account sheet); a preview frame can ask for another. */
export async function getDesign(): Promise<Design> {
  const preview = (await headers()).get(DESIGN_PREVIEW_HEADER);
  if (isDesign(preview)) return preview;
  const v = (await cookies()).get(DESIGN_COOKIE)?.value;
  return isDesign(v) ? v : DEFAULT_DESIGN;
}
