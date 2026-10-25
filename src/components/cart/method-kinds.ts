import {
  METHOD_BASE_ID,
  METHOD_BASE_KIND,
  METHODS,
  type DefaultableKind,
  type MethodKind,
} from "~/lib/constants";
import type { MethodCatalog } from "~/services/method";

/**
 * The kind a method id pays with: the catalogue's own row for it or, for an id
 * the catalogue no longer carries (a method deleted after a draft named it, or a
 * draft read back before the catalogue loads), the built-in base id it was filed
 * under. A draft row keeps its money when its method is deleted, so it must
 * still resolve to a kind.
 */
export function methodKind(catalog: MethodCatalog | null, methodId: string): MethodKind {
  const known = catalog?.methods.find((method) => method.id === methodId);
  if (known !== undefined) return known.kind;
  return (METHOD_BASE_KIND as Record<string, MethodKind | undefined>)[methodId] ?? "cash";
}

/**
 * Every method id a kind can pay with: the named accounts inside it (QRIS
 * Mandiri, QRIS BNI) first, then its base method (Tunai, plain QRIS). Accounts
 * come first because a base method says less — `freeMethodId` walks this order,
 * so a transfer row prefers BCA/Mandiri over bare `Transfer`. The base id is
 * always in the list: it is what the built-in rows are, and what a kind falls
 * back to when its accounts are all taken.
 */
export function methodIdsOfKind(catalog: MethodCatalog, kind: MethodKind): string[] {
  const base = METHOD_BASE_ID[kind];
  const accounts = catalog.methods
    .filter((method) => method.kind === kind && method.name !== null && method.id !== base)
    .map((method) => method.id);
  return [...accounts, base];
}

/**
 * The method id a row takes when the cashier picks `kind`: the kind's configured
 * default if that one is still free, else the first free method of the kind,
 * else the base id.
 *
 * A kind is not a method. Picking Transfer while another row already pays BCA
 * must not land on BCA again — it lands on Mandiri, or on plain Transfer when
 * the accounts are spoken for.
 */
export function freeMethodId(
  catalog: MethodCatalog,
  kind: MethodKind,
  taken: ReadonlySet<string>,
): string {
  const ids = methodIdsOfKind(catalog, kind);
  const preferred = kind === "cash" ? undefined : catalog.defaults[kind as DefaultableKind];
  if (preferred !== undefined && ids.includes(preferred) && !taken.has(preferred)) {
    return preferred;
  }
  return ids.find((id) => !taken.has(id)) ?? METHOD_BASE_ID[kind];
}

/** Whether every method of a kind is already spoken for by another row. */
export function kindExhausted(
  catalog: MethodCatalog,
  kind: MethodKind,
  taken: ReadonlySet<string>,
): boolean {
  return methodIdsOfKind(catalog, kind).every((id) => taken.has(id));
}

/**
 * The kind `+` lands on: the first in `METHODS` order that still has a free
 * method — cash, then QRIS, transfer, debit. A draft paid in cash adds QRIS; one
 * already paying QRIS Mandiri still adds QRIS, as QRIS BNI or plain QRIS.
 * `null` once every kind is exhausted, which is what disables `Tambah metode`.
 */
export function nextFreeKind(
  catalog: MethodCatalog,
  taken: ReadonlySet<string>,
): MethodKind | null {
  return METHODS.find((kind) => !kindExhausted(catalog, kind, taken)) ?? null;
}
