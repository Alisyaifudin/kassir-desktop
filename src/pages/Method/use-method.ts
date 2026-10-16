import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { DEFAULTABLE_KINDS, type DefaultableKind } from "~/lib/constants";

/** Which tab is open, kept in the URL so the page can be linked to. */
export function useMethod() {
  const [search, setSearch] = useSearchParams();
  const method = useMemo(
    () => z.enum(DEFAULTABLE_KINDS).catch("transfer").parse(search.get("method")),
    [search],
  );
  const setMethod = (method: DefaultableKind) => setSearch({ method });
  return [method, setMethod] as const;
}
