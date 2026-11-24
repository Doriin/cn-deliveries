import { describe, expect, it } from "vitest";
import type { ShipmentStatus } from "@prisma/client";
import { checkDetailsChange, checkPaymentChange, diffDetails, undoTarget } from "./corrections";

const pay = (amount: number, method: "CASH_RECEIPT" | "CASH_NO_RECEIPT" | "CARD" = "CASH_NO_RECEIPT", receiptNo: string | null = null) => ({ amount, method, receiptNo });

describe("payment corrections", () => {
  const base = { handedOver: false, status: "OUT_FOR_DELIVERY" as ShipmentStatus, codAmount: 134900, paidOthers: 0 };
  it("accepts a fixed method, amount or receipt", () => {
    expect(checkPaymentChange({ ...base, current: pay(134900), next: pay(134900, "CASH_RECEIPT", "0042") })).toBeNull();
    expect(checkPaymentChange({ ...base, current: pay(134900), next: pay(100000) })).toBeNull();
    expect(checkPaymentChange({ ...base, current: pay(134900), next: null })).toBeNull();
  });
  it("still needs a positive amount and a receipt number for cash with receipt", () => {
    expect(checkPaymentChange({ ...base, current: pay(134900), next: pay(0) })).toBe("invalidAmount");
    expect(checkPaymentChange({ ...base, current: pay(134900), next: pay(134900, "CASH_RECEIPT") })).toBe("receiptRequired");
  });
  it("keeps cash already handed to the office: only the receipt number can change", () => {
    const handed = { ...base, handedOver: true, current: pay(134900, "CASH_RECEIPT", "11") };
    expect(checkPaymentChange({ ...handed, next: pay(134900, "CASH_RECEIPT", "12") })).toBeNull();
    expect(checkPaymentChange({ ...handed, next: pay(100000, "CASH_RECEIPT", "11") })).toBe("handedOver");
    expect(checkPaymentChange({ ...handed, next: pay(134900, "CARD") })).toBe("handedOver");
    expect(checkPaymentChange({ ...handed, next: null })).toBe("handedOver");
  });
  it("does not leave a delivered order with less COD than it needs", () => {
    const delivered = { ...base, status: "DELIVERED" as ShipmentStatus, current: pay(134900) };
    expect(checkPaymentChange({ ...delivered, next: pay(134900, "CARD") })).toBeNull();
    expect(checkPaymentChange({ ...delivered, next: pay(100000) })).toBe("deliveredNeedsCod");
    expect(checkPaymentChange({ ...delivered, next: null })).toBe("deliveredNeedsCod");
    expect(checkPaymentChange({ ...delivered, paidOthers: 134900, next: null })).toBeNull();
  });
});

describe("order detail corrections", () => {
  it("lists only the fields that changed, treating empty and missing as the same", () => {
    const before = { recipientPhone: "+373 69 111 111", notes: null, weightGrams: 1000, desiredDate: new Date("2026-11-21T00:00:00Z") };
    const after = { recipientPhone: "+373 69 222 222", notes: "", weightGrams: 1000, desiredDate: new Date("2026-11-22T00:00:00Z") };
    expect(diffDetails(before, after, ["recipientPhone", "notes", "weightGrams", "desiredDate"])).toEqual({
      recipientPhone: ["+373 69 111 111", "+373 69 222 222"],
      desiredDate: ["2026-11-21", "2026-11-22"],
    });
  });
  it("does not raise a delivered order's COD above what was collected", () => {
    expect(checkDetailsChange({ status: "DELIVERED", codAmount: 150000, paid: 134900 })).toBe("deliveredNeedsCod");
    expect(checkDetailsChange({ status: "DELIVERED", codAmount: 134900, paid: 134900 })).toBeNull();
    expect(checkDetailsChange({ status: "OUT_FOR_DELIVERY", codAmount: 150000, paid: 0 })).toBeNull();
  });
});

describe("undoing a status", () => {
  const ev = (id: string, toStatus: ShipmentStatus, minute: number, opts: { reason?: string; undone?: boolean } = {}) => ({
    id, toStatus, reason: opts.reason ?? null, createdAt: new Date(2026, 10, 21, 10, minute), undoneAt: opts.undone ? new Date() : null,
  });
  it("undoes the latest step and goes back to the one before, with its reason", () => {
    const events = [ev("a", "NEW", 0), ev("b", "OUT_FOR_DELIVERY", 1), ev("c", "FAILED_ATTEMPT", 2, { reason: "NO_ANSWER" }), ev("d", "DELIVERED", 3)];
    expect(undoTarget(events, "DELIVERED")).toEqual({ event: events[3], back: "FAILED_ATTEMPT", reason: "NO_ANSWER" });
  });
  it("skips steps already undone, so it can go back more than once", () => {
    const events = [ev("a", "NEW", 0), ev("b", "CONFIRMED", 1), ev("c", "PICKED_UP", 2, { undone: true })];
    expect(undoTarget(events, "CONFIRMED")?.back).toBe("NEW");
  });
  it("never undoes the order's first step, or a step that no longer matches the order", () => {
    expect(undoTarget([ev("a", "NEW", 0)], "NEW")).toBeNull();
    expect(undoTarget([ev("a", "NEW", 0), ev("b", "CONFIRMED", 1)], "PICKED_UP")).toBeNull();
  });
});
