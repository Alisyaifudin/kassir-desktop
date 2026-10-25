import { memo } from "react";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Skeleton } from "~/components/ui/skeleton";
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

/**
 * The checkbox row while `info` is loading: the label is static, the box is the
 * size of the real one and pulses. An empty box would read as "unchecked".
 */
export function CashierSkeleton() {
  return (
    <Label className="flex items-center gap-3" aria-busy="true" aria-label="Memuat opsi kasir">
      <span>Tampilkan Nama Kasir</span>
      <Skeleton className="h-6 w-6 rounded-sm" />
    </Label>
  );
}
