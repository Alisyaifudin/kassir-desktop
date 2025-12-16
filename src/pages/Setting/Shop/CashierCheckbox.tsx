import { memo } from "react";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useNavigation, useSubmit } from "react-router";
import { Action } from "./action";
import { useAction } from "~/hooks/use-action";

export const CashierCheckbox = memo(function ({ showCashier }: { showCashier: boolean }) {
  const [loading, handleCheck] = useCheckbox();
  const error = useAction<Action>()("show-cashier");
  return (
    <>
      <Label className="flex items-center gap-3">
        <span>Tampilkan Nama Kasir</span>
        <Checkbox defaultChecked={showCashier} onCheckedChange={handleCheck} />
        <Spinner when={loading} />
      </Label>
      <TextError>{error}</TextError>
    </>
  );
});

export function useCheckbox() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const handleCheck = async (e: CheckedState) => {
    const formdata = new FormData();
    formdata.set("action", "show-cashier");
    formdata.set("check", String(e));
    submit(formdata, { method: "POST" });
  };
  return [loading, handleCheck] as const;
}
