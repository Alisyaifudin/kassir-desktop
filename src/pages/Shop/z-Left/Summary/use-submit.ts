import { Effect, Either } from "effect";
import { submit } from "./util-submit";
import { log } from "~/lib/log";
import { toast } from "sonner";
import { setComplete } from "../../z-Complete";
import { resetStore } from "../../use-transaction";
import { useTab } from "../../use-tab";
import { useState } from "react";
import { productsStore } from "../../store/product";

export function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [tab] = useTab();
  async function handleSubmit(isCredit: boolean) {
    const productsError = productsStore
      .get()
      .context.map((p) => p.error)
      .filter((p) => p !== undefined);
    if (productsError.length > 0) {
      toast.error("Masih ada error, cek lagi.");
      return;
    }
    setLoading(true);
    const either = await Effect.runPromise(
      submit(isCredit).pipe(
        Effect.catchTag("NotEnoughError", (e) => Effect.fail(e.message)),
        Effect.catchTag("DbError", ({ e }) => {
          log.error(e);
          return Effect.fail("Aplikasi bermasalah");
        }),
        Effect.either,
      ),
    );
    setLoading(false);
    Either.match(either, {
      onLeft(left) {
        toast.error(left);
      },
      onRight({ change, grandTotal, timestamp }) {
        setComplete({
          open: true,
          grandTotal,
          change,
          timestamp,
        });
        resetStore(tab);
      },
    });
  }
  return { loading, handleSubmit };
}
