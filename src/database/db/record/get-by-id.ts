import { DB } from "../instance";
import Decimal from "decimal.js";
import { Effect } from "effect";
import { NotFound } from "~/lib/effect-error";


// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export function getRecordById(id: string) {
  return Effect.gen(function* () {
  });
}
