import { METHOD_NAMES } from "~/lib/constants";
import type { Method } from "~/services/method";
import type { DraftMethod } from "~/services/transaction";

/** One line of "what was tendered": a method's name and the money against it. */
export type PaidMethod = { id: string; name: string; value: number };

/**
 * The payment rows the completion dialog prints, from the draft's methods and the
 * catalog the payment strip already read.
 *
 * An untouched method is not a payment: the strip draws every method of a kind, so
 * the draft holds a row for each and only the ones with money mean anything. A
 * method that has since been deleted keeps its money in the draft, so it is
 * labelled from its kind rather than dropped.
 */
export function paidMethods(
  methods: readonly DraftMethod[],
  catalog: readonly Method[],
): PaidMethod[] {
  return methods
    .filter((method) => method.value !== 0)
    .map((method) => {
      const known = catalog.find((candidate) => candidate.id === method.methodId);
      return {
        id: method.id,
        name: known === undefined ? "Metode" : (known.name ?? METHOD_NAMES[known.kind]),
        value: method.value,
      };
    });
}
