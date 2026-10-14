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
  normalizeSelection,
  parseSelection,
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
