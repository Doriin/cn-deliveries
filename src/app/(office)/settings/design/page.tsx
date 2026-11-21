import { getTranslations } from "next-intl/server";
import { DESIGNS, DESIGN_META, NEW_DESIGNS } from "@/lib/design";
import { getDesign } from "@/lib/design.server";
import { DesignChoice } from "./DesignChoice";

/** Lets the owner switch between the candidate designs while deciding which one to keep. */
export default async function DesignSettingsPage() {
  const t = await getTranslations("design");
  const current = await getDesign();
  const older = DESIGNS.filter((d) => !NEW_DESIGNS.includes(d));
  const labels = { use: t("use"), current: t("current"), switching: t("switching") };
  return (
    <div className="dz">
      <header className="dz-head">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>

      <section className="dz-round">
        <div className="dz-round-head">
          <h2>{t("round2")}</h2>
          <p>{t("round2Intro")}</p>
        </div>
        <div className="dz-trio">
          {NEW_DESIGNS.map((d, i) => (
            <DesignChoice
              key={d} id={d} index={i} big
              name={t(`name.${d}`)} about={t(`about.${d}`)} traits={t.raw(`traits.${d}`) as string[]}
              shell={DESIGN_META[d].shell} on={d === current}
              src={`/?__design=${d}`} frame={{ w: 1440, h: 900 }}
              labels={{ ...labels, live: t("live"), open: t("open") }}
            />
          ))}
        </div>
      </section>

      <details className="dz-older">
        <summary><span>{t("earlier")}</span><b>{older.length}</b></summary>
        <div className="dz-grid">
          {older.map((d, i) => (
            <DesignChoice
              key={d} id={d} index={i}
              name={`${t(`name.${d}`)} · ${t("draft", { no: DESIGN_META[d].no ?? 0 })}`} about={t(`about.${d}`)}
              shell={DESIGN_META[d].shell} on={d === current}
              src={`/drafts/${DESIGN_META[d].draft}.html`} frame={{ w: 1640, h: 930 }}
              labels={labels}
            />
          ))}
        </div>
      </details>
      <p className="dz-foot">{t("perDevice")}</p>
    </div>
  );
}
