import { Either, Effect } from "effect";
import { toast } from "sonner";
import { service } from "~/services";
import { useUser } from "~/hooks/use-user";

/**
 * One implementation of "Bayar" for both cart screens.
 *
 * The sequence — refuse when the cart is not ready, blur the active cell, mark
 * the screen busy, run `transaction.submit` exactly once, then either toast the
 * failure or hand the completion payload to the dialog — used to exist twice,
 * once per screen and in two different shapes (`submitDraft(): boolean` on Pos,
 * `runSubmit(): Promise<string | null>` on Restock). Any future rule (a
 * double-submit guard, a receipt auto-print, an offline retry, "this sale
 * belongs to the previous cashier") belongs here, once.
 *
 * What genuinely differs stays a prop: what "ready" means for a sale versus a
 * purchase (a credit purchase may leave the change negative, a sale may not),
 * and what the completion dialog needs to show.
 */
export function useSubmitCart<C>({
  activeId,
  blocked,
  ready,
  setSubmitting,
  setComplete,
  build,
}: {
  /** The cart being committed; `null` while the screen has no draft open. */
  activeId: string | null;
  /** `complete !== null || submitting || hardIssue` — nothing may be committed. */
  blocked: boolean;
  /** The screen's own preconditions (a total exists, the tender covers it, …). */
  ready: (credit: boolean) => boolean;
  setSubmitting: (submitting: boolean) => void;
  setComplete: (complete: C) => void;
  /** The completion payload for a committed record. */
  build: (recordId: string, credit: boolean) => C;
}) {
  const user = useUser();

  /** Start the commit; `null` on success, the failure message otherwise. */
  async function submit(credit = false): Promise<string | null> {
    if (activeId === null || blocked || !ready(credit)) {
      return "Transaksi belum siap untuk disimpan.";
    }
    (document.activeElement as HTMLElement | null)?.blur();
    setSubmitting(true);
    const result = await Effect.runPromise(
      Effect.either(service.transaction.submit(activeId, { cashier: user.name, credit })),
    );
    setSubmitting(false);
    if (Either.isLeft(result)) {
      toast.error(result.left.message);
      return result.left.message;
    }
    setComplete(build(result.right, credit));
    return null;
  }

  /**
   * The click/keyboard form of Bayar: starts the commit and answers "may the key
   * be swallowed?" — a cart that is not ready stays exactly where it is.
   */
  function submitDraft(credit = false): boolean {
    if (activeId === null || blocked || !ready(credit)) return false;
    void submit(credit);
    return true;
  }

  return { submit, submitDraft };
}
