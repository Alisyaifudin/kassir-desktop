import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useChangePrinterWidth } from "./use-change-width";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";

export function PrinterWidth({ width: init }: { width: number }) {
  const { width, error, handleChange, handleSubmit, loading } = useChangePrinterWidth(init);
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Label htmlFor="receipt-width" className="text-normal font-semibold">
          Lebar Struk (mm)
        </Label>
        <Spinner when={loading} />
      </div>
      <p className="text-muted-foreground text-small">
        Atur lebar kertas struk untuk printer thermal
      </p>
      <Input
        id="receipt-width"
        type="number"
        required
        value={width}
        onChange={handleChange}
        min={1}
        max={500}
        className="bg-background border-border mt-1"
      />
      <TextError>{error}</TextError>
    </form>
  );
}
