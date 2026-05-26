import { Effect } from "effect";
import { useEffect } from "react";
import { toast } from "sonner";
import { loadProducts } from "~/hooks/use-get-products";
import { log } from "~/lib/log";

export function useLoadProducts(role: DB.Role) {
  useEffect(() => {
    async function init() {
      const errMsg = await Effect.runPromise(
        loadProducts().pipe(
          Effect.as(null),
          Effect.catchTag("DbError", ({ e }) => {
            log.error(e);
            return Effect.succeed(e.message);
          }),
        ),
      );
      if (errMsg !== null) {
        toast.error(errMsg);
      }
    }
    if (role === "admin") {
      init();
    }
  }, [role]);
}
