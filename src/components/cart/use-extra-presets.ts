import { useMemo } from "react";
import { useStream } from "~/components/Loader";
import { service } from "~/services";
import type { ExtraPreset } from "./types";

/**
 * The extras catalog, live — what both cart screens' `Tambahan` search filters.
 *
 * Never a hardcoded list: an extra the owner adds, renames or re-prices in the
 * Extra page must reach the sale and purchase screens without a reload, with its
 * configured kind and value, or the cashier seeds a charge worth nothing and has
 * to retype the rate on every sale.
 */
export function useExtraPresets(): ExtraPreset[] {
  const res = useStream(service.extra.get.changes);
  return useMemo(
    () =>
      res.type === "success"
        ? res.data.map(({ id, name, kind, value }) => ({ id, name, kind, value }))
        : [],
    [res],
  );
}
