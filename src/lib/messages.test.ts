import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ro from "../../messages/ro.json";
import ru from "../../messages/ru.json";

function keys(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`])).sort();
}

describe("translations", () => {
  it("ro, ru and en have the same keys", () => {
    expect(keys(ro)).toEqual(keys(en));
    expect(keys(ru)).toEqual(keys(en));
  });
});
