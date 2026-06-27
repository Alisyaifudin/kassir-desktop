import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Effect } from "effect";
import { InfoService } from "~/services/info";

export const cashierCheckbox = Effect.gen(function* () {
  const infoService = yield* InfoService;
  const useShowCashier = infoService.showCashier.useData;
  const setShowCashier = (state: CheckedState) => {
    if (state === "indeterminate") return;
    infoService.showCashier.setData(state);
  };
  return function CashierCheckbox() {
    const { data: showCashier, state, error } = useShowCashier();
    const loading = state === "loading";
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
