// The scope predicate is a file, not a constant: the Rust graph builder
// (`src-tauri/src/graph.rs`) reads the same one with `include_str!`.
import SCOPE_FILE from "./scope.sql?raw";

/**
 * `scope.sql`, with its alias substituted and its comments removed.
 *
 * Stripping is not cosmetic. The fragment is spliced in directly after a
 * `WHERE`, so a leading `--` would comment out the clause it belongs to.
 *
 * Both callers below are derived from this one function, and both live here rather
 * than in a layer module so that a third reader — the report — cannot quietly
 * acquire a slightly different copy. `report/live.ts` used to be the third reader;
 * the moment two files each hold their own `scope()`, a fix to `scope.sql`'s
 * substitutions reaches one of them.
 */
export function scope(alias: "" | "r."): string {
  return SCOPE_FILE.replace(/--[^\n]*/g, " ")
    .replace(/\{r\}/g, alias)
    .replace(/\s+/g, " ")
    .trim();
}

/** The fragment for a query that aliases `records` as `r`. */
export const SCOPE_R = scope("r.");

/** The fragment for a query that reads `records` unaliased. */
export const SCOPE_PLAIN = scope("");
