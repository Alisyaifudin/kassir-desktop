import { METHOD_NAMES, METHODS, type MethodKind } from "~/lib/constants";
import type { Method } from "~/services/method";
import type { Record as RecordModel, RecordMethod } from "~/services/record";
import { roundToFix } from "~/services/record/round";

/** The base method has no name; every named method under a kind is a variant. */
function isBaseMethod(method: Method): boolean {
  return method.name === null || method.name === "";
}

export type MethodGroup = {
  base: Method;
  /** Named variants; each matches only itself. */
  subs: Method[];
};

/** One group per built-in kind, in canonical order; a kind with no base row is skipped. */
export function groupMethods(methods: readonly Method[]): MethodGroup[] {
  return METHODS.map((kind) => {
    const base = methods.find((method) => method.kind === kind && isBaseMethod(method));
    if (base === undefined) return null;
    return {
      base,
      subs: methods.filter((method) => method.kind === kind && !isBaseMethod(method)),
    };
  }).filter((group): group is MethodGroup => group !== null);
}

/**
 * A selection is two sets, because one set can't say what the UI needs to say.
 *
 * `kinds` means "any payment of this kind" — it also covers variants whose
 * `methods` row has since been deleted, which an id list can't.
 *
 * `methods` is exact ids. It has to exist as a separate axis because records
 * really do pay with a *base* row (plain Tunai is the single most-used method:
 * 38k rows), so "all of Transfer except BCA" must be able to name the base
 * transfer id explicitly alongside the other variants. Folding the base id into
 * the kind token would drag BCA back in with it.
 */
export type MethodSelection = {
  kinds: MethodKind[];
  methods: string[];
};

export const EMPTY_SELECTION: MethodSelection = { kinds: [], methods: [] };

function isEmptySelection(selection: MethodSelection): boolean {
  return selection.kinds.length === 0 && selection.methods.length === 0;
}

export function selectionCount(selection: MethodSelection): number {
  return selection.kinds.length + selection.methods.length;
}

export function parseSelection(kinds: string | null, methods: string | null): MethodSelection {
  const split = (raw: string | null): string[] =>
    raw === null
      ? []
      : raw
          .split(",")
          .map((token) => token.trim())
          .filter((token) => token !== "");
  const known = new Set<string>(METHODS);
  return {
    // Unknown kinds are dropped rather than trusted through to the matcher.
    kinds: split(kinds).filter((kind): kind is MethodKind => known.has(kind)),
    methods: [...new Set(split(methods))],
  };
}

/**
 * Collapse to the canonical form: a kind covers its own base id and variants, and
 * a full set of them collapses back into the kind. Without this, ticking every
 * variant by hand would mean "those exact ids" instead of "all Transfer", and
 * would quietly miss deleted variants.
 */
export function normalizeSelection(
  selection: MethodSelection,
  groups: readonly MethodGroup[],
): MethodSelection {
  const kinds = new Set(selection.kinds);
  const methods = new Set(selection.methods);

  for (const group of groups) {
    const kind = group.base.kind;
    if (kinds.has(kind)) {
      methods.delete(group.base.id);
      for (const sub of group.subs) methods.delete(sub.id);
      continue;
    }
    const whole = [group.base.id, ...group.subs.map((sub) => sub.id)];
    if (whole.every((id) => methods.has(id))) {
      for (const id of whole) methods.delete(id);
      kinds.add(kind);
    }
  }

  return {
    kinds: METHODS.filter((kind) => kinds.has(kind)),
    methods: [...methods].sort(),
  };
}

/** Ticking a kind takes all its variants; unticking it releases them all. */
export function toggleKindSelection(
  selection: MethodSelection,
  groups: readonly MethodGroup[],
  group: MethodGroup,
): MethodSelection {
  const kinds = new Set(selection.kinds);
  const methods = new Set(selection.methods);
  const kind = group.base.kind;

  if (kinds.has(kind)) kinds.delete(kind);
  else kinds.add(kind);
  // Either way the kind decides this group, so its ids stop being named.
  methods.delete(group.base.id);
  for (const sub of group.subs) methods.delete(sub.id);

  return normalizeSelection({ kinds: [...kinds], methods: [...methods] }, groups);
}

export function toggleSubSelection(
  selection: MethodSelection,
  groups: readonly MethodGroup[],
  group: MethodGroup,
  sub: Method,
): MethodSelection {
  const kinds = new Set(selection.kinds);
  const methods = new Set(selection.methods);
  const kind = group.base.kind;
  const checked = kinds.has(kind) || methods.has(sub.id);

  if (!checked) {
    methods.add(sub.id);
  } else if (kinds.has(kind)) {
    // The kind was covering every variant, so unticking one has to expand the
    // rest — base row included — into explicit ids. That's the "Transfer
    // without BCA" case, and the base row is what keeps plain transfers in.
    kinds.delete(kind);
    methods.add(group.base.id);
    for (const other of group.subs) if (other.id !== sub.id) methods.add(other.id);
  } else {
    methods.delete(sub.id);
  }

  return normalizeSelection({ kinds: [...kinds], methods: [...methods] }, groups);
}

/** `true` / `false` / `"indeterminate"` — the shape Radix's checkbox takes. */
export type KindState = boolean | "indeterminate";

export function kindStateOf(
  selection: MethodSelection,
  group: MethodGroup,
): KindState {
  if (selection.kinds.includes(group.base.kind)) return true;
  // The base row alone (or any single variant) means "part of this kind".
  const touched =
    selection.methods.includes(group.base.id) ||
    group.subs.some((sub) => selection.methods.includes(sub.id));
  return touched ? "indeterminate" : false;
}

export function subCheckedOf(
  selection: MethodSelection,
  group: MethodGroup,
  sub: Method,
): boolean {
  return selection.kinds.includes(group.base.kind) || selection.methods.includes(sub.id);
}

/** A payment is in the selection when its kind or its own id is named. */
function paymentMatches(
  payment: RecordMethod,
  kinds: ReadonlySet<string>,
  methods: ReadonlySet<string>,
): boolean {
  return kinds.has(payment.kind) || methods.has(payment.methodId);
}

/**
 * A record matches when any of its payments is a selected kind or a selected
 * method. Records carry every payment applied (split payment), so any hit wins;
 * an empty selection filters nothing.
 */
export function matchesMethod(record: RecordModel, selection: MethodSelection): boolean {
  if (isEmptySelection(selection)) return true;
  const kinds = new Set<string>(selection.kinds);
  const methods = new Set(selection.methods);
  return record.methods.some((payment) => paymentMatches(payment, kinds, methods));
}

/**
 * One payment of the list's `Total` column: what a method took, and what it
 * contributed. `key` is the method id, unique inside a record — the id the line
 * is rendered under.
 */
export type PaymentLine = {
  key: string;
  label: string;
  /** The method's kind; it is what tells the list where the change came from. */
  kind: MethodKind;
  /** What the method was handed. */
  pay: number;
  /**
   * What the method contributed to what was due: `pay` less the change it handed
   * back. The list prints this, so a split's figures add up to the grand total
   * without the total being printed a second time.
   */
  contribution: number;
};

/**
 * `QRIS Mandiri` for a named variant, `Tunai` for a base method — the shape the
 * receipt's method line uses, so the list and the receipt name a payment alike.
 */
export function methodLabel(method: Pick<RecordMethod, "kind" | "name">): string {
  const name = method.name?.trim() ?? "";
  return name === "" ? METHOD_NAMES[method.kind] : `${METHOD_NAMES[method.kind]} ${name}`;
}

/**
 * A record's payments as the list can show them: only those the filter lets
 * through, with no zero-pay leftovers (an unsettled split keeps those, and they
 * carry no money — the same rule the detail pane's money band applies), and
 * several rows for one method merged into a single line.
 *
 * Stored order is kept, so a split payment reads in the order it was paid, and a
 * filter that leaves one payment collapses the record back to a single line.
 */
export function recordPaymentLines(record: RecordModel, selection: MethodSelection): PaymentLine[] {
  const kinds = new Set<string>(selection.kinds);
  const methods = new Set(selection.methods);
  const unfiltered = isEmptySelection(selection);
  const lines: PaymentLine[] = [];
  const byMethod = new Map<string, PaymentLine>();

  for (const payment of record.methods) {
    if (!unfiltered && !paymentMatches(payment, kinds, methods)) continue;
    if (payment.pay === 0) continue;
    const merged = byMethod.get(payment.methodId);
    if (merged !== undefined) {
      merged.pay += payment.pay;
      merged.contribution += payment.pay;
      continue;
    }
    const line = {
      key: payment.methodId,
      label: methodLabel(payment),
      kind: payment.kind,
      pay: payment.pay,
      contribution: payment.pay,
    };
    byMethod.set(payment.methodId, line);
    lines.push(line);
  }

  return applyChange(record, lines);
}

/** The payments that carry money — an unsettled split keeps zero-pay rows, and
 *  they are not tenders, so they can neither take the change nor own it. */
function moneyedPayments(record: RecordModel): RecordModel["methods"] {
  return record.methods.filter((payment) => payment.pay !== 0);
}

/**
 * Change is money handed back, not a payment, so it comes off the tender that
 * produced it: the cash line, which is where a cashier counts the coins out. A
 * record that took no cash at all — an over-tendered transfer — gives the change
 * back on its last moneyed method instead.
 *
 * Only a line that is on screen can be docked. A filter that hides that tender
 * adjusts nothing: the lines left on screen are their own money, and taking a
 * hidden row's change off them would print a figure no method ever paid. Which
 * tender owns the change is read from the record, not from the lines — a filter
 * that hides the cash of a split record has not turned it into a cashless one.
 * A filter that *keeps* the over-tendered line still has change to take off it.
 */
function applyChange(record: RecordModel, lines: PaymentLine[]): PaymentLine[] {
  const change = record.change ?? 0;
  if (change <= 0 || lines.length === 0) return lines;

  const moneyed = moneyedPayments(record);
  const takesCash = moneyed.some((payment) => payment.kind === "cash");
  const owner = takesCash
    ? lines.find((line) => line.kind === "cash")
    : lines.find((line) => line.key === moneyed[moneyed.length - 1]?.methodId);
  if (owner === undefined) return lines;

  owner.contribution = roundToFix(owner.pay - change, record.fix);
  return lines;
}
