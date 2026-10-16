import { memo } from "react";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useMutation } from "~/components/Loader";
import { patchInfo } from "./util-patch-info";

export const CashierCheckbox = memo(function CashierCheckbox({
  showCashier,
}: {
  showCashier: boolean;
}) {
  const { pending, error, mutate } = useMutation(patchInfo);
  const handleCheck = (checked: CheckedState) => {
    void mutate({ showCashier: checked === true });
  };
  return (
    <>
      <Label className="flex items-center gap-3">
        <span>Tampilkan Nama Kasir</span>
        <Checkbox checked={showCashier} onCheckedChange={handleCheck} />
        <Spinner when={pending} />
      </Label>
      <TextError>{error?.message ?? null}</TextError>
    </>
  );
});
