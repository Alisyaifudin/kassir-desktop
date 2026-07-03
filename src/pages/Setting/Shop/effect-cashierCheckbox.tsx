import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Effect } from "effect";
import { ShowCashierService } from "~/services/info";
import { useState } from "react";

export const cashierCheckbox = Effect.gen(function* () {
  const infoService = yield* ShowCashierService;
  const useShowCashier = () => infoService.useShowCashier();
  const set = (showCashier: boolean) => infoService.set(showCashier);
  return function CashierCheckbox() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const showCashier = useShowCashier();
    const setShowCashier = async (state: CheckedState) => {
      if (state === "indeterminate") return;
      setLoading(true);
      const error = await set(state);
      setLoading(false);
      setError(error);
    };
    return (
      <>
        <Label className="flex items-center gap-3">
          <span>Tampilkan Nama Kasir</span>
          <Checkbox checked={showCashier} onCheckedChange={setShowCashier} />
          <Spinner when={loading} />
        </Label>
        <TextError>{error}</TextError>
      </>
    );
  };
});
