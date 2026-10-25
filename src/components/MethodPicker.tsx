import {
  METHOD_BASE_ID,
  METHODS,
  METHOD_NAMES,
  type DefaultableKind,
  type MethodKind,
  METHOD_KBD,
} from "~/lib/constants";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Kbd } from "~/components/ui/kdb";
import type { MethodCatalog } from "~/services/method";
import { freeMethodId, kindExhausted } from "~/components/cart/method-kinds";

/**
 * How the app asks "paid with what?" — two levels, because a method is a kind
 * (Tunai, QRIS, Transfer, Debit) and, for everything but cash, one or more
 * named accounts inside it (BCA, Mandiri, Shopee).
 *
 * The kind is the first select; the account only appears when the kind has
 * named accounts. `--Pilih--` is the kind's base method — the base id is not an
 * account, so it doubles as the empty choice (Radix forbids an empty
 * `SelectItem` value).
 *
 * The cart's settlement dialog and the `/transaction` bar share this, so the
 * pair can never drift on labels, ordering or the kind→account reset.
 */
export function MethodPicker({
  methodId,
  catalog,
  onChange,
  excludeMethodIds,
}: {
  methodId: string;
  catalog: MethodCatalog;
  onChange: (methodId: string) => void;
  /**
   * Method ids another row of the same transaction already pays with. One
   * transaction names each method once, so those are not offered here — but a
   * kind is only hidden once *all* of its methods are (a row paying `QRIS
   * Mandiri` hides that account, not QRIS: `QRIS BNI` and plain `QRIS` stay).
   * The row's own id is always kept: it is what the trigger shows, and keeping
   * it is what lets a row drawn before the constraint still render.
   */
  excludeMethodIds?: readonly string[];
}) {
  const taken = new Set(excludeMethodIds ?? []);
  /** Free for this row — another row's is not, except the row's own id. */
  const free = (id: string) => id === methodId || !taken.has(id);
  const method = catalog.methods.find((candidate) => candidate.id === methodId);
  const kind: MethodKind = method?.kind ?? "cash";
  const accounts = catalog.methods.filter(
    (candidate) => candidate.kind === kind && candidate.name !== null && free(candidate.id),
  );
  const accountId = accounts.some((account) => account.id === methodId)
    ? methodId
    : METHOD_BASE_ID[kind];
  const kinds = METHODS.filter(
    (candidate) => candidate === kind || !kindExhausted(catalog, candidate, taken),
  );

  return (
    <div className="flex min-w-0 gap-1">
      <Select
        value={kind}
        onValueChange={(value) => onChange(freeMethodId(catalog, value as MethodKind, taken))}
      >
        <SelectTrigger
          aria-label="Metode"
          title="Tunai (Ctrl+0), QRIS (Ctrl+1), Transfer (Ctrl+2), Debit (Ctrl+3)"
          className="w-full"
        >
          <SelectValue>{METHOD_NAMES[kind]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {kinds.map((candidate) => (
              <SelectItem
                key={candidate}
                value={candidate}
                kbd={<Kbd>{METHOD_KBD[candidate]}</Kbd>}
              >
                {METHOD_NAMES[candidate]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {accounts.length > 0 ? (
        <Select value={accountId} onValueChange={onChange}>
          <SelectTrigger aria-label="Akun" className="w-full">
            <SelectValue placeholder="--Pilih--" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {/* `--Pilih--` is the kind's base method, so it is only offered
                  while the base id is still free for this row. */}
              {free(METHOD_BASE_ID[kind]) ? (
                <SelectItem value={METHOD_BASE_ID[kind]}>--Pilih--</SelectItem>
              ) : null}
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

/** The kind's default account when it has one, else the built-in base method. */
export function defaultMethodId(catalog: MethodCatalog, kind: MethodKind): string {
  if (kind !== "cash") {
    const fallback = catalog.defaults[kind as DefaultableKind];
    if (fallback !== undefined) return fallback;
  }
  return METHOD_BASE_ID[kind];
}
