import { METHODS, type MethodKind } from "~/lib/constants";
import type { Method } from "~/services/method";
import type { Record as RecordModel } from "~/services/record";

/** The base method has no name; every named method under a kind is a variant. */
export function isBaseMethod(method: Method): boolean {
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

export function isEmptySelection(selection: MethodSelection): boolean {
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

/**
 * A record matches when any of its payments is a selected kind or a selected
 * method. Records carry every payment applied (split payment), so any hit wins;
 * an empty selection filters nothing.
 */
export function matchesMethod(record: RecordModel, selection: MethodSelection): boolean {
  if (isEmptySelection(selection)) return true;
  const kinds = new Set<string>(selection.kinds);
  const methods = new Set(selection.methods);
  return record.methods.some(
    (payment) => kinds.has(payment.kind) || methods.has(payment.methodId),
  );
}
