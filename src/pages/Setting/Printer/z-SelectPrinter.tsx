import { Gate } from "~/components/page-data";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Printer } from "~/services/printer";
import { PendingValue } from "~/components/page-data";
import { ReservedSkeleton } from "~/components/page-data";
import { pageData } from "./data";
import { useChangePrinterName } from "./use-change-name";

/**
 * Which printer receipts go to.
 *
 * The label and the sentence under it are static. The control is the value: while
 * `printer` or the system's list is still being read it renders disabled and
 * empty with a pulse inside, so the field keeps the exact size and the chevron it
 * will have once a name lands.
 */
export function SelectPrinter() {
  const res = pageData.useAll("printer", "printers");

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="default-printer" className="text-normal font-semibold">
        Printer Terpilih
      </Label>
      <p className="text-normal text-muted-foreground">
        Pilih printer yang akan digunakan untuk mencetak struk
      </p>

      <Gate
        res={res}
        // The control is its own floor, so it is mounted at once (reserving its
        // height) but stays invisible for the anti-flash window.
        delay={0}
        skeleton={
          <ReservedSkeleton>
            <PendingValue pulse="left-3 top-1/2 w-40 -translate-y-1/2">
              <Select disabled value="">
                <SelectTrigger
                  id="default-printer"
                  className="mt-1 w-56 border-border bg-background small:w-44"
                >
                  <SelectValue placeholder=" " />
                </SelectTrigger>
              </Select>
            </PendingValue>
          </ReservedSkeleton>
        }
        error={(error) => <TextError>{error.message}</TextError>}
      >
        {({ data }) => <Picker printer={data.printer} printers={data.printers} />}
      </Gate>
    </div>
  );
}

/**
 * The control itself. It is a separate component because its hooks need real data
 * (`useChangePrinterName` seeds from the stored printer), which is the one thing
 * a gated region must not do above its `Gate`.
 */
function Picker({ printer, printers }: { printer: Printer; printers: string[] }) {
  // The stored printer can be gone (unplugged, renamed): show the first one the
  // system offers instead, without claiming it has been written yet.
  const fallback = printers.includes(printer.name)
    ? printer.name
    : (printers.at(0) ?? printer.name);
  const { error, handleChange, loading, name } = useChangePrinterName(printer, fallback);

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={name} onValueChange={handleChange}>
          <SelectTrigger
            id="default-printer"
            className="mt-1 w-56 border-border bg-background small:w-44"
          >
            <SelectValue placeholder={printer.name} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {printers.map((it) => (
                <SelectItem key={it} value={it}>
                  {it}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Spinner when={loading} />
      </div>
      <TextError>{error}</TextError>
    </>
  );
}
