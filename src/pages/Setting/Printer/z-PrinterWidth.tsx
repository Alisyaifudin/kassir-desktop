import { Gate } from "~/components/page-data";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { Printer } from "~/services/printer";
import { PendingValue } from "../z-PendingValue";
import { ReservedSkeleton } from "../z-ReservedSkeleton";
import { pageData } from "./data";
import { useChangePrinterWidth } from "./use-change-width";

/**
 * Paper width in mm. Only `printer` is read here — the system's printer list is
 * not part of this field — so this control can be usable while the list is still
 * being read.
 */
export function PrinterWidth() {
  const res = pageData.use("printer");

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="receipt-width" className="text-normal font-semibold">
        Lebar Struk (mm)
      </Label>
      <p className="text-normal text-muted-foreground">
        Atur lebar kertas struk untuk printer thermal
      </p>

      <Gate
        res={res}
        delay={0}
        skeleton={
          <ReservedSkeleton>
            <PendingValue pulse="left-3 top-1/2 w-16 -translate-y-1/2">
              <Input id="receipt-width" disabled className="mt-1 border-border bg-background" />
            </PendingValue>
          </ReservedSkeleton>
        }
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ data }) => <WidthForm printer={data} />}
      </Gate>
    </div>
  );
}

/** Its own component: `useChangePrinterWidth` seeds from the stored width. */
function WidthForm({ printer }: { printer: Printer }) {
  const { width, error, handleChange, handleSubmit, loading } = useChangePrinterWidth(printer);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          id="receipt-width"
          type="number"
          required
          value={width}
          onChange={handleChange}
          min={1}
          max={500}
          className="mt-1 border-border bg-background"
        />
        <Spinner when={loading} />
      </div>
      <TextError>{error}</TextError>
    </form>
  );
}
