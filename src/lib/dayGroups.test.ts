import { describe, expect, it } from "vitest";
import { STATUSES } from "./status";
import { dayGroup } from "./dayGroups";

describe("dayGroup", () => {
  it("puts every problem status under attention", () => {
    expect(["FAILED_ATTEMPT", "ON_HOLD", "REFUSED"].map((s) => dayGroup(s as never))).toEqual(["bad", "bad", "bad"]);
  });
  it("follows a parcel through the normal day", () => {
    expect(["NEW", "CONFIRMED", "PICKED_UP", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"].map((s) => dayGroup(s as never))).toEqual(["pickup", "pickup", "road", "depot", "road", "done"]);
  });
  it("drops parcels that left the day and covers every other status", () => {
    expect(dayGroup("RETURNED")).toBeNull();
    expect(dayGroup("CANCELLED")).toBeNull();
    expect(STATUSES.filter((s) => dayGroup(s) === null)).toEqual(["RETURNED", "CANCELLED"]);
  });
});
