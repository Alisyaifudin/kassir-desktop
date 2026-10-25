import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useMutation } from "~/components/Loader";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useSize, type Size } from "~/hooks/use-size";
import { service } from "~/services";

function isSize(value: string): value is Size {
  return value === "big" || value === "small";
}

/** What each of the two app sizes is called on screen. */
const label: Record<Size, string> = { big: "Besar", small: "Kecil" };

/**
 * Which of the two app sizes this machine runs at. It writes as soon as it
 * changes — there is nothing to save, so the row says so instead of pretending
 * there is a form.
 *
 * The control sits at the far edge like the chevron of a destination row above
 * it: the hub reads as one list of "things this app does", and this is the one
 * thing on it that applies immediately.
 */
export function SelectSize() {
  const size = useSize();
  const { pending, error, mutate } = useMutation(service.config.size.set);

  function handleChange(value: string) {
    if (!isSize(value)) {
      toast.error("Pilihan tidak valid");
      return;
    }
    void mutate(value);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <Label htmlFor="app-size" className="text-normal font-semibold">
              Ukuran
            </Label>
            <Spinner when={pending} />
          </div>
          <p className="text-normal text-muted-foreground">
            Berlaku langsung untuk seluruh aplikasi di mesin ini
          </p>
        </div>
        <Select value={size} onValueChange={handleChange}>
          <SelectTrigger
            id="app-size"
            className="w-56 shrink-0 border-border bg-background small:w-40"
          >
            <SelectValue>{label[size]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="small">{label.small}</SelectItem>
              <SelectItem value="big">{label.big}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <TextError>{error?.message ?? null}</TextError>
    </div>
  );
}
