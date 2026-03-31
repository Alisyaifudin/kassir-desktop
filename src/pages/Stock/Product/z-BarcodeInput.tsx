import { RefreshCw } from "lucide-react";
import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { FieldLabel } from "~/components/ui/field";
import { generateId } from "~/lib/random";
import { useFieldContext } from "./util-product-options";
import { useStore } from "@tanstack/react-form";

export function BarcodeInput() {
  const field = useFieldContext<string>();
  const isSubmitting = useStore(field.form.store, (state) => state.isSubmitting);
  return (
    <Field error={field.state.meta.errors}>
      <FieldLabel htmlFor="barcode">Kode</FieldLabel>
      <Input
        type="text"
        disabled={isSubmitting}
        className="outline w-full"
        name="barcode"
        id="barcode"
        aria-autocomplete="list"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.currentTarget.value)}
      />
      <GenerateBarcode barcode={field.state.value} setBarcode={field.handleChange} />
    </Field>
  );
}

function GenerateBarcode({
  barcode,
  setBarcode,
}: {
  barcode: string;
  setBarcode: (barcode: string) => void;
}) {
  const handleClick = () => {
    const randomId = generateId();
    setBarcode(randomId);
  };
  return (
    <div>
      <Show when={barcode.trim() === ""}>
        <Button onClick={handleClick} type="button" variant="ghost">
          <RefreshCw className="icon" />
        </Button>
      </Show>
    </div>
  );
}

function Field({ children, error }: { children: React.ReactNode; error?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[120px_1fr_60px] small:grid-cols-[80px_1fr_50px] items-center">
        {children}
      </div>
      {error}
    </div>
  );
}
