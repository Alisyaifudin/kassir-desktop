import { describe, expect, test } from "bun:test";
import {
  allocateFifo,
  depleteLots,
  drainStatements,
  receiveAtCapital,
  settleNegative,
  type StockLot,
} from "./stock-sql";

/** The journal rows a batch of statements writes, in order. */
const events = (statements: ReturnType<typeof drainStatements>["statements"]) =>
  statements
    .filter((statement) => statement.sql.includes("INSERT INTO product_events"))
    .map((statement) => ({
      value: statement.bindings![2] as number,
      capital: statement.bindings![3] as number,
      stockId: statement.bindings![5] as string,
      recordId: statement.bindings![6] as string | null,
      note: statement.bindings![7] as string,
    }));

const lots: StockLot[] = [
  { id: "old", value: 3, capital: 100 },
  { id: "empty", value: 0, capital: 90 },
  { id: "new", value: 5, capital: 200 },
];

describe("FIFO lot allocation", () => {
  test("takes from the oldest positive lot first", () => {
    const { takes, shortage } = allocateFifo(lots, 4);
    expect(takes.map(({ lot, take }) => [lot.id, take])).toEqual([
      ["old", 3],
      ["new", 1],
    ]);
    expect(shortage).toBe(0);
  });

  test("reports an uncovered remainder rather than planning negative stock", () => {
    const { takes, shortage } = allocateFifo(lots, 10);
    expect(takes.map(({ lot, take }) => [lot.id, take])).toEqual([
      ["old", 3],
      ["new", 5],
    ]);
    expect(shortage).toBe(2);
  });

  test("depletes the caller's lot snapshot without changing the source", () => {
    const afterFirstLine = depleteLots(lots, 4);
    const afterSecondLine = depleteLots(afterFirstLine, 3);
    expect(afterFirstLine.map((lot) => lot.value)).toEqual([0, 0, 4]);
    expect(afterSecondLine.map((lot) => lot.value)).toEqual([0, 0, 1]);
    expect(lots.map((lot) => lot.value)).toEqual([3, 0, 5]);
    expect(afterSecondLine.map((lot) => lot.capital)).toEqual([100, 90, 200]);
  });
});

const drainLots = (...values: number[]): StockLot[] =>
  values.map((value, index) => ({ id: `l${index + 1}`, value, capital: (index + 1) * 1000 }));

describe("drainStatements", () => {
  test("clamps every lot but the last at zero and moves the rest on", () => {
    const result = drainStatements("p", drainLots(2, 5), 4, 1);
    expect(result.portions.map((p) => [p.stockId, p.take])).toEqual([
      ["l1", 2],
      ["l2", 2],
    ]);
    expect(result.lots.map((l) => l.value)).toEqual([0, 3]);
    expect(result.shortage).toBe(0);
  });

  test("lets the last lot go negative when it cannot cover the remainder", () => {
    const result = drainStatements("p", drainLots(2, 1), 4, 1);
    expect(result.portions.map((p) => [p.stockId, p.take])).toEqual([
      ["l1", 2],
      ["l2", 2],
    ]);
    expect(result.lots.map((l) => l.value)).toEqual([0, -1]);
  });

  test("keeps the capital of each lot it touches", () => {
    const result = drainStatements("p", drainLots(2, 1), 4, 1);
    expect(result.portions.map((p) => p.capital)).toEqual([1000, 2000]);
    expect(result.lots[1].capital).toBe(2000);
  });

  test("skips empty lots in the middle and lets the last one absorb all", () => {
    const result = drainStatements("p", drainLots(5, 0, 3), 10, 1);
    expect(result.portions.map((p) => [p.stockId, p.take])).toEqual([
      ["l1", 5],
      ["l3", 5],
    ]);
    expect(result.lots.map((l) => l.value)).toEqual([0, 0, -2]);
  });

  test("drains a single lot into the negative", () => {
    const result = drainStatements("p", drainLots(0), 4, 1);
    expect(result.portions.map((p) => [p.stockId, p.take])).toEqual([["l1", 4]]);
    expect(result.lots[0].value).toBe(-4);
  });

  test("does nothing when there is nothing to take", () => {
    const result = drainStatements("p", drainLots(2), 0, 1);
    expect(result.statements).toEqual([]);
    expect(result.portions).toEqual([]);
    expect(result.shortage).toBe(0);
  });
});


describe("settleNegative", () => {
  test("fills an oversold lot from the arrival and keeps the rest at the price paid", () => {
    // Sold 1 pc at 10.000 before its goods were booked, then 12 pcs arrived at
    // 12.000: 1 pc closes the hole, the other 11 are worth 12.000 each.
    const result = receiveAtCapital(
      "p",
      [{ id: "hole", value: -1, capital: 10000 }],
      { pcs: 12, capital: 12000 },
      10,
      0,
      "r1",
    );
    // The hole is the only thing there was, so it takes the arrival's price and
    // the rest lands in it rather than beside an empty husk.
    expect(result.lots).toEqual([{ id: "hole", value: 11, capital: 12000 }]);
    expect(result.capital).toBe(12000);
    // Worth what the 11 pcs cost, not the hole's -10.000 plus the whole purchase.
    const value = result.lots.reduce((total, lot) => total + lot.value * lot.capital, 0);
    expect(value).toBe(132000);
    expect(events(result.statements).map((event) => [event.value, event.capital])).toEqual([
      [1, 10000],
      [0, 12000],
      [11, 12000],
    ]);
  });

  test("opens a lot for the rest when the product holds other stock", () => {
    const result = receiveAtCapital(
      "p",
      [
        { id: "kept", value: 5, capital: 8000 },
        { id: "hole", value: -1, capital: 10000 },
      ],
      { pcs: 12, capital: 12000 },
      10,
      0,
      "r1",
    );
    expect(result.lots.map((lot) => [lot.id, lot.value, lot.capital])).toEqual([
      ["kept", 5, 8000],
      ["hole", 0, 10000],
      [result.stockId, 11, 12000],
    ]);
    expect(result.stockId).not.toBe("hole");
  });

  test("keeps the hole negative and adopts the price when the arrival cannot cover it", () => {
    const result = receiveAtCapital(
      "p",
      [{ id: "hole", value: -15, capital: 10000 }],
      { pcs: 12, capital: 12000 },
      10,
      0,
      "r1",
    );
    expect(result.lots).toEqual([{ id: "hole", value: -3, capital: 12000 }]);
    expect(result.stockId).toBe("hole");
    // The record paid 12.000 per pc, so that is the portion's cost too.
    expect(result.capital).toBe(12000);
    expect(events(result.statements).map((event) => [event.value, event.capital, event.note])).toEqual([
      [12, 10000, "Tutup stok minus"],
      [0, 12000, "Modal stok minus"],
    ]);
  });

  test("adopts the price when the arrival covers the hole exactly", () => {
    const result = receiveAtCapital(
      "p",
      [{ id: "hole", value: -12, capital: 10000 }],
      { pcs: 12, capital: 12000 },
      10,
      0,
      "r1",
    );
    expect(result.lots).toEqual([{ id: "hole", value: 0, capital: 12000 }]);
    expect(result.stockId).toBe("hole");
    expect(events(result.statements).map((event) => [event.value, event.capital])).toEqual([
      [12, 10000],
      [0, 12000],
    ]);
  });

  test("leaves a bonus arrival's capital alone", () => {
    const result = settleNegative(
      "p",
      [{ id: "hole", value: -5, capital: 10000 }],
      { pcs: 3, capital: 0 },
      10,
      0,
      "r1",
    );
    expect(result.lots).toEqual([{ id: "hole", value: -2, capital: 10000 }]);
    expect(result.filled).toBe(3);
  });

  test("writes nothing when every hole already carries the arrival's price", () => {
    const result = settleNegative(
      "p",
      [{ id: "hole", value: -2, capital: 1000 }],
      { pcs: 4, capital: 1000 },
      10,
      2,
      "r1",
    );
    expect(result.statements).toEqual([]);
    expect(result.filled).toBe(0);
    expect(result.eventId).toBeNull();
  });

  test("closes the newest hole first, undoing the drain in order", () => {
    const result = settleNegative(
      "p",
      [
        { id: "older", value: -3, capital: 1000 },
        { id: "newer", value: -2, capital: 2000 },
      ],
      { pcs: 4, capital: 3000 },
      10,
      0,
      "r1",
    );
    expect(result.lots.map((lot) => [lot.value, lot.capital])).toEqual([
      [-1, 3000],
      [0, 2000],
    ]);
    const written = events(result.statements);
    expect(
      written.filter((event) => event.value > 0).map((event) => [event.stockId, event.value]),
    ).toEqual([
      ["newer", 2],
      ["older", 2],
    ]);
    // The lot still owed stock takes the price that just arrived.
    expect(written.filter((event) => event.value === 0).map((event) => [event.stockId, event.capital, event.note])).toEqual([
      ["older", 3000, "Modal stok minus"],
    ]);
  });

  test("tags every event with the record so deleting it restores the lot", () => {
    const result = receiveAtCapital(
      "p",
      [{ id: "hole", value: -15, capital: 10000 }],
      { pcs: 12, capital: 12000 },
      10,
      0,
      "r1",
    );
    expect(events(result.statements).map((event) => event.recordId)).toEqual(["r1", "r1"]);
  });
});

describe("receiveAtCapital", () => {
  const matchingLots: StockLot[] = [
    { id: "old", value: 2, capital: 1000 },
    { id: "empty", value: 0, capital: 1000 },
    { id: "new", value: 5, capital: 1000 },
  ];

  test("opens a new lot when no capital matches", () => {
    const result = receiveAtCapital(
      "p",
      [{ id: "old", value: 2, capital: 1000 }],
      { pcs: 4, capital: 1200 },
      10,
      2,
      "r1",
    );
    expect(result.lots.map((lot) => lot.value)).toEqual([2, 4]);
    expect(result.lots[1].capital).toBe(1200);
    expect(result.capital).toBe(1200);
    expect(result.statements.filter((s) => s.sql.includes("INSERT INTO product_events"))).toHaveLength(1);
  });

  test("points at an existing matching lot and keeps its exact capital", () => {
    const result = receiveAtCapital(
      "p",
      [{ id: "old", value: 2, capital: 1000 }],
      { pcs: 4, capital: 1000.004 },
      10,
      2,
      "r1",
    );
    expect(result.stockId).toBe("old");
    expect(result.capital).toBe(1000);
    expect(result.lots[0].value).toBe(6);
    expect(result.statements.filter((s) => s.sql.includes("INSERT INTO product_events"))).toHaveLength(1);
  });

  test("combines every matching lot into the oldest one", () => {
    const result = receiveAtCapital("p", matchingLots, { pcs: 4, capital: 1000 }, 10, 2, "r1");
    expect(result.stockId).toBe("old");
    expect(result.lots.map((lot) => lot.value)).toEqual([11, 0, 0]);
    // one non-empty transfer × two journal rows, plus the purchase event
    expect(result.statements.filter((s) => s.sql.includes("INSERT INTO product_events"))).toHaveLength(3);
  });

  test("reuses a matching lot even when its cached value is negative", () => {
    const result = receiveAtCapital(
      "p",
      [{ id: "negative", value: -2, capital: 1000 }],
      { pcs: 4, capital: 1000 },
      10,
      2,
      "r1",
    );
    expect(result.stockId).toBe("negative");
    expect(result.lots[0].value).toBe(2);
    expect(result.statements.filter((s) => s.sql.includes("INSERT INTO product_events"))).toHaveLength(1);
  });

  test("treats capitals equal at the record's fix as the same lot", () => {
    const result = receiveAtCapital(
      "p",
      [
        { id: "a", value: 1, capital: 1000.004 },
        { id: "b", value: 2, capital: 1000.001 },
      ],
      { pcs: 1, capital: 1000.002 },
      10,
      2,
      "r1",
    );
    expect(result.stockId).toBe("a");
    expect(result.lots.map((lot) => lot.value)).toEqual([4, 0]);
  });
});
