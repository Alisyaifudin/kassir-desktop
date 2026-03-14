import { memo, useState } from "react";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Effect, pipe } from "effect";
import { store } from "~/store";
import { log } from "~/lib/log";
import { revalidate } from "./use-data";

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
    const error = await Effect.runPromise(program(checked));
    setLoading(false);
    setError(error);
    if (error === null) {
      revalidate();
    }
  };
  return { loading, error, handleCheck };
}

function program(checked: boolean) {
  return pipe(
    store.info.set.showCashier(checked),
    Effect.as(null),
    Effect.catchTag("StoreError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
