import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useStream, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { Method, MethodError } from "~/services/method";
import {
  EMPTY_SELECTION,
  groupMethods,
  kindStateOf,
  normalizeSelection,
  parseSelection,
  selectionCount,
  subCheckedOf,
  toggleKindSelection,
  toggleSubSelection,
  type MethodGroup,
  type MethodSelection,
} from "./method-filter";

/** Stable identity for the pre-load case, so memo deps don't churn every render. */
const NO_METHODS: Method[] = [];

export function useMethods(): Result<Method[], MethodError> {
  return useStream(service.method.get.changes);
}

/**
 * Multi-select payment-method filter. The selection rules live in
 * `method-filter.ts`; this only owns the two URL params — `kinds` for whole
 * kinds, `methods` for exact ids (the `kinds=a,b` convention Product's filter
 * already uses).
 */
export function useMethodFilter() {
  const [search, setSearch] = useSearchParams();
  const res = useMethods();
  const methods = res.type === "success" ? res.data : NO_METHODS;
  const groups = useMemo(() => groupMethods(methods), [methods]);
  const selection = useMemo(
    () => normalizeSelection(parseSelection(search.get("kinds"), search.get("methods")), groups),
    [search, groups],
  );

  const commit = useCallback(
    (next: MethodSelection) => {
      setSearch(
        (old) => {
          const params = new URLSearchParams(old);
          if (next.kinds.length === 0) params.delete("kinds");
          else params.set("kinds", next.kinds.join(","));
          if (next.methods.length === 0) params.delete("methods");
          else params.set("methods", next.methods.join(","));
          return params;
        },
        // Ticking boxes shouldn't fill the history stack.
        { replace: true },
      );
    },
    [setSearch],
  );

  const toggleKind = useCallback(
    (group: MethodGroup) => commit(toggleKindSelection(selection, groups, group)),
    [selection, groups, commit],
  );

  const toggleSub = useCallback(
    (group: MethodGroup, sub: Method) =>
      commit(toggleSubSelection(selection, groups, group, sub)),
    [selection, groups, commit],
  );

  const clear = useCallback(() => commit(EMPTY_SELECTION), [commit]);

  const kindState = useCallback(
    (group: MethodGroup) => kindStateOf(selection, group),
    [selection],
  );

  const subChecked = useCallback(
    (group: MethodGroup, sub: Method) => subCheckedOf(selection, group, sub),
    [selection],
  );

  return {
    res,
    groups,
    selection,
    activeCount: selectionCount(selection),
    kindState,
    subChecked,
    toggleKind,
    toggleSub,
    clear,
  } as const;
}
