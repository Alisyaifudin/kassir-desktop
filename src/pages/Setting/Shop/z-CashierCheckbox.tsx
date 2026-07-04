import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useState } from "react";

type Props = {
  showCashier: boolean;
  onSetShowCashier: (showCashier: boolean) => Promise<string | null>;
};

export function CashierCheckbox({ showCashier, onSetShowCashier }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const handleChange = async (state: CheckedState) => {
    if (state === "indeterminate") return;
    setLoading(true);
    const err = await onSetShowCashier(state);
    setLoading(false);
    setError(err);
  };

  return (
    <>
      <Label className="flex items-center gap-3">
        <span>Tampilkan Nama Kasir</span>
        <Checkbox checked={showCashier} onCheckedChange={handleChange} />
        <Spinner when={loading} />
      </Label>
      <TextError>{error}</TextError>
    </>
  );
}
