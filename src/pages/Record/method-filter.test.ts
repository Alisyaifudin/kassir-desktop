/**
 * Behaviour checks for the /records payment-method filter.
 *
 * Run with:  bun test src/pages/Record/method-filter.test.ts
 *
 * The fixture mirrors the shapes in the app's own database: plain Tunai (base id
 * 1000) is the most-used method by a wide margin, and Transfer carries a base row
 * (1001) *plus* named variants — which is why the selection needs two axes.
 */
import { describe, expect, test } from "bun:test";
import type { Method } from "~/services/method";
import type { Record as RecordModel } from "~/services/record";
import {
  EMPTY_SELECTION,
  groupMethods,
  kindStateOf,
  matchesMethod,
  methodLabel,
  normalizeSelection,
  parseSelection,
  recordPaymentLines,
  selectionCount,
  subCheckedOf,
  toggleKindSelection,
  toggleSubSelection,
  type MethodGroup,
  type MethodSelection,
} from "./method-filter";

const method = (id: string, name: string | null, kind: string): Method =>
  ({ id, name, kind, deletedAt: null }) as unknown as Method;

const catalog: Method[] = [
  method("1000", null, "cash"),
  method("1001", null, "transfer"),
  method("1002", null, "debit"),
  method("1003", null, "qris"),
  method("4", "BCA", "transfer"),
  method("6", "Dana 1", "transfer"),
  method("1005", "Mandiri", "qris"),
];

const groups = groupMethods(catalog);
const groupOf = (kind: string): MethodGroup => {
  const found = groups.find((g) => g.base.kind === kind);
  if (found === undefined) throw new Error(`no group for ${kind}`);
  return found;
};

const transfer = groupOf("transfer");
const cash = groupOf("cash");
const BCA = method("4", "BCA", "transfer");
const DANA = method("6", "Dana 1", "transfer");

const record = (payments: [string, string][]): RecordModel =>
  ({ methods: payments.map(([methodId, kind]) => ({ methodId, kind })) }) as unknown as RecordModel;

const plainCash = record([["1000", "cash"]]);
const plainTransfer = record([["1001", "transfer"]]); // the 273-row case
const bca = record([["4", "transfer"]]);
const dana = record([["6", "transfer"]]);
const qrisMandiri = record([["1005", "qris"]]);
const split = record([
  ["1000", "cash"],
  ["1005", "qris"],
]);
const ALL = [plainCash, plainTransfer, bca, dana, qrisMandiri, split];

/** Indices of the records a selection keeps. */
const kept = (selection: MethodSelection): number[] =>
  ALL.map((r, i) => (matchesMethod(r, selection) ? i : -1)).filter((i) => i >= 0);

describe("shape of the fixture", () => {
  test("transfer has variants, cash has none", () => {
    expect(transfer.subs.map((s) => s.id)).toEqual(["4", "6"]);
    expect(cash.subs).toEqual([]);
  });
});

describe("nothing selected", () => {
  test("filters nothing at all", () => {
    expect(kept(EMPTY_SELECTION)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(selectionCount(EMPTY_SELECTION)).toBe(0);
  });
});

describe("ticking a kind", () => {
  test("covers its variants too", () => {
    const s = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    expect(s).toEqual({ kinds: ["transfer"], methods: [] });
    expect(kindStateOf(s, transfer)).toBe(true);
    for (const sub of transfer.subs) expect(subCheckedOf(s, transfer, sub)).toBe(true);
  });

  test("matches the base row and its variants alike", () => {
    const s = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    expect(kept(s)).toEqual([1, 2, 3]); // not cash, qris or the split
  });

  test("a kind with no variants is just the kind", () => {
    const s = toggleKindSelection(EMPTY_SELECTION, groups, cash);
    expect(s).toEqual({ kinds: ["cash"], methods: [] });
    expect(kept(s)).toEqual([0, 5]); // the split counts once
  });
});

describe("unticking a kind", () => {
  test("releases every variant", () => {
    const ticked = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    const s = toggleKindSelection(ticked, groups, transfer);
    expect(s).toEqual(EMPTY_SELECTION);
    expect(kindStateOf(s, transfer)).toBe(false);
    for (const sub of transfer.subs) expect(subCheckedOf(s, transfer, sub)).toBe(false);
  });
});

describe("unticking one variant under a ticked kind", () => {
  test("keeps the base method — plain transfers must not vanish", () => {
    const ticked = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    const s = toggleSubSelection(ticked, groups, transfer, BCA);
    expect(s).toEqual({ kinds: [], methods: ["1001", "6"] });
    expect(kept(s)).toEqual([1, 3]); // plain transfer AND Dana, no BCA
  });

  test("the kind reads indeterminate, not unchecked", () => {
    const ticked = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    const s = toggleSubSelection(ticked, groups, transfer, BCA);
    expect(kindStateOf(s, transfer)).toBe("indeterminate");
    expect(subCheckedOf(s, transfer, BCA)).toBe(false);
    expect(subCheckedOf(s, transfer, DANA)).toBe(true);
  });

  test("dropping every variant leaves only the base method selected", () => {
    let s = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    s = toggleSubSelection(s, groups, transfer, BCA);
    s = toggleSubSelection(s, groups, transfer, DANA);
    expect(s).toEqual({ kinds: [], methods: ["1001"] });
    expect(kept(s)).toEqual([1]); // only plain transfers
    expect(kindStateOf(s, transfer)).toBe("indeterminate");
  });

  test("re-ticking the last variant collapses back to the kind", () => {
    let s = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    s = toggleSubSelection(s, groups, transfer, BCA);
    s = toggleSubSelection(s, groups, transfer, BCA);
    expect(s).toEqual({ kinds: ["transfer"], methods: [] });
    expect(kept(s)).toEqual([1, 2, 3]);
  });
});

describe("building the same set from the other direction", () => {
  test("every variant, then the base id, collapses to the kind", () => {
    let s = EMPTY_SELECTION;
    for (const sub of transfer.subs) s = toggleSubSelection(s, groups, transfer, sub);
    expect(kindStateOf(s, transfer)).toBe("indeterminate"); // base id still missing
    s = toggleSubSelection(s, groups, transfer, method("1001", null, "transfer"));
    expect(s).toEqual({ kinds: ["transfer"], methods: [] });
  });
});

describe("combining", () => {
  test("kinds are OR-ed", () => {
    const s = toggleKindSelection(
      toggleKindSelection(EMPTY_SELECTION, groups, cash),
      groups,
      groupOf("qris"),
    );
    expect(s).toEqual({ kinds: ["cash", "qris"], methods: [] });
    expect(kept(s)).toEqual([0, 4, 5]);
  });

  test("a lone variant filters to itself", () => {
    const s = toggleSubSelection(EMPTY_SELECTION, groups, transfer, DANA);
    expect(s).toEqual({ kinds: [], methods: ["6"] });
    expect(kept(s)).toEqual([3]);
  });
});

describe("URL round-trip", () => {
  test("parses both params and drops unknown kinds", () => {
    expect(parseSelection("transfer,nonsense", "1001,4")).toEqual({
      kinds: ["transfer"],
      methods: ["1001", "4"],
    });
    expect(parseSelection(null, null)).toEqual(EMPTY_SELECTION);
    expect(parseSelection("", "")).toEqual(EMPTY_SELECTION);
  });

  test("canonical kind order is stable whatever the input order", () => {
    const a = normalizeSelection({ kinds: ["qris", "cash"], methods: [] }, groups);
    const b = normalizeSelection({ kinds: ["cash", "qris"], methods: [] }, groups);
    expect(a.kinds).toEqual(["cash", "qris"]);
    expect(a).toEqual(b);
  });
});

/**
 * The list's `Total` column breaks a split payment into one line per method, but
 * only for the payments the filter lets through — a filter that leaves one
 * payment has nothing to break down and must collapse back to a single line.
 */
const paid = (
  payments: [methodId: string, kind: string, pay: number, name: string | null][],
  extra: Partial<RecordModel> = {},
): RecordModel =>
  ({
    fix: 0,
    change: 0,
    methods: payments.map(([methodId, kind, pay, name]) => ({ methodId, kind, pay, name })),
    ...extra,
  }) as unknown as RecordModel;

const cashAndMandiri = paid([
  ["1000", "cash", 15_000, null],
  ["1005", "qris", 5_000, "Mandiri"],
]);

describe("payment lines for the Total column", () => {
  test("an empty filter keeps every payment, in the order it was paid", () => {
    expect(recordPaymentLines(cashAndMandiri, EMPTY_SELECTION)).toEqual([
      { key: "1000", label: "Tunai", kind: "cash", pay: 15_000, contribution: 15_000 },
      { key: "1005", label: "QRIS Mandiri", kind: "qris", pay: 5_000, contribution: 5_000 },
    ]);
  });

  test("a filter that keeps one payment leaves one line — the record collapses", () => {
    const cashOnly = toggleKindSelection(EMPTY_SELECTION, groups, cash);
    expect(recordPaymentLines(cashAndMandiri, cashOnly)).toEqual([
      { key: "1000", label: "Tunai", kind: "cash", pay: 15_000, contribution: 15_000 },
    ]);
  });

  test("a filter that keeps both payments keeps both lines", () => {
    const both = toggleKindSelection(
      toggleKindSelection(EMPTY_SELECTION, groups, cash),
      groups,
      groupOf("qris"),
    );
    expect(recordPaymentLines(cashAndMandiri, both).map((line) => line.label)).toEqual([
      "Tunai",
      "QRIS Mandiri",
    ]);
  });

  test("a filter matching none of the payments leaves no line at all", () => {
    const transferOnly = toggleKindSelection(EMPTY_SELECTION, groups, transfer);
    expect(recordPaymentLines(cashAndMandiri, transferOnly)).toEqual([]);
  });

  test("a zero-pay row carries no money, so it gets no line", () => {
    const record = paid([
      ["1000", "cash", 0, null],
      ["1005", "qris", 5_000, "Mandiri"],
    ]);
    expect(recordPaymentLines(record, EMPTY_SELECTION).map((line) => line.key)).toEqual(["1005"]);
  });

  test("two rows of one method merge into a single line", () => {
    const record = paid([
      ["1000", "cash", 4_000, null],
      ["1005", "qris", 5_000, "Mandiri"],
      ["1000", "cash", 1_000, null],
    ]);
    expect(recordPaymentLines(record, EMPTY_SELECTION)).toEqual([
      { key: "1000", label: "Tunai", kind: "cash", pay: 5_000, contribution: 5_000 },
      { key: "1005", label: "QRIS Mandiri", kind: "qris", pay: 5_000, contribution: 5_000 },
    ]);
  });

  test("a base method is named by its kind, a variant by its name after it", () => {
    expect(methodLabel({ kind: "transfer", name: null })).toBe("Transfer");
    expect(methodLabel({ kind: "transfer", name: "BCA" })).toBe("Transfer BCA");
    // A row that lost its method keeps a label rather than printing nothing.
    expect(recordPaymentLines(paid([["gone", "cash", 1, null]]), EMPTY_SELECTION)[0]?.label).toBe(
      "Tunai",
    );
  });
});

/**
 * The list prints what each method *contributed*, not what it was handed: the
 * change came back out of the drawer, so it comes off the cash line, and a split
 * then adds up to the record's grand total without the total being printed a
 * second time. A record that took no cash at all gives the change back on its
 * last method; a filter that hides the tender which produced it adjusts nothing.
 */
describe("change comes off the tender that produced it", () => {
  const split = paid(
    [
      ["1000", "cash", 15_000, null],
      ["1005", "qris", 10_000, "BNI"],
    ],
    { grandTotal: 20_000, change: 5_000 },
  );

  test("cash hands the change back, and what a method took is untouched", () => {
    const lines = recordPaymentLines(split, EMPTY_SELECTION);

    expect(lines.map((line) => line.contribution)).toEqual([10_000, 10_000]);
    // `pay` still says 15.000: the receipt and the detail pane print that.
    expect(lines.map((line) => line.pay)).toEqual([15_000, 10_000]);
    expect(lines.reduce((sum, line) => sum + line.contribution, 0)).toBe(split.grandTotal);
  });

  test("no cash: the last method gives the change back", () => {
    const overTendered = paid([["1005", "qris", 25_000, "BNI"]], {
      grandTotal: 20_000,
      change: 5_000,
    });

    expect(
      recordPaymentLines(overTendered, EMPTY_SELECTION).map((line) => line.contribution),
    ).toEqual([20_000]);
  });

  test("a filter that hides the cash line takes its change with it", () => {
    const qrisOnly = toggleKindSelection(EMPTY_SELECTION, groups, groupOf("qris"));

    // QRIS paid 10.000 and is shown as 10.000: subtracting the cash line's
    // change here would print a figure QRIS never paid.
    expect(recordPaymentLines(split, qrisOnly).map((line) => line.contribution)).toEqual([10_000]);
  });

  test("an underpaid record — an open credit — hands nothing back", () => {
    const credit = paid([["1000", "cash", 5_000, null]], {
      grandTotal: 20_000,
      pay: 5_000,
      change: -15_000,
    });

    expect(recordPaymentLines(credit, EMPTY_SELECTION)[0]?.contribution).toBe(5_000);
  });
});
