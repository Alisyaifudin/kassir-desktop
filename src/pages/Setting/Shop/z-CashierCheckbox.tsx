import { memo, useState } from "react";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Effect, pipe } from "effect";
import { store } from "~/store-effect";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";

export const CashierCheckbox = memo(function ({ showCashier }: { showCashier: boolean }) {
  const { loading, handleCheck, error } = useCheckbox();
  return (
    <>
      <Label className="flex items-center gap-3">
        <span>Tampilkan Nama Kasir</span>
        <Checkbox checked={showCashier} onCheckedChange={handleCheck} />
        <Spinner when={loading} />
      </Label>
      <TextError>{error}</TextError>
    </>
  );
});

function useCheckbox() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleCheck = async (e: CheckedState) => {
    const checked = e === true;
    setLoading(true);
    const error = await pipe(
      store.info.set.showCashier(checked),
      Effect.map(() => {
        revalidate("shop");
        return null;
      }),
      Effect.catchTag("StoreError", (e) => {
        log.error(JSON.stringify(e.e.stack));
        return Effect.succeed(e.e.message);
      }),
      Effect.runPromise,
    );
    setLoading(false);
    setError(error);
  };
  return { loading, error, handleCheck };
}
