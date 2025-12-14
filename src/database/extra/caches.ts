export type Extra = {
  id: number;
  name: string;
  value: number;
  kind: DB.ValueKind;
};

let cache: Extra[] | null = null;

export function getCache() {
  return cache;
}

export function setCache(updated: (Extra[] | null) | ((cache: Extra[]) => Extra[])) {
  if (typeof updated === "function") {
    if (cache === null) return;
    cache = updated(cache);
    return;
  }
  cache = updated;
}
