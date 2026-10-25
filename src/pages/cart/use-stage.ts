import { useSearchParams } from "react-router";
import { z } from "zod";

/**
 * Which stage the main panel is showing, kept in the URL so a refresh or a
 * shared link lands on the same step. `stage` is the one spelling of it.
 *
 * The stage list is the screen's own (`Pos` toggles between goods and extras,
 * `Restock` adds a payment stage), so it is a parameter rather than an import:
 * an unknown value in a stale link falls back to the first stage.
 *
 * Replaces the history entry: moving between Produk and Tambahan is a step
 * inside one screen, not a place to go Back to.
 */
export function useStage<S extends string>(stages: readonly [S, ...S[]]) {
  const [search, setSearch] = useSearchParams();
  const stage = z.enum(stages).catch(stages[0]).parse(search.get("stage"));
  const setStage = (next: S) => {
    setSearch(
      (old) => {
        const s = new URLSearchParams(old);
        s.set("stage", next);
        return s;
      },
      { replace: true },
    );
  };
  return [stage, setStage] as const;
}
