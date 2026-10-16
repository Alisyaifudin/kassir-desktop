import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useMutation } from "~/components/Loader";
import { useSize, type Size } from "~/hooks/use-size";
import { service } from "~/services";

function isSize(value: string): value is Size {
  return value === "big" || value === "small";
}

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
    <div className="flex items-center gap-2">
      <label className="font-semibold text-normal">Ukuran</label>
      <select
        value={size}
        className="p-1 outline text-normal"
        onChange={(e) => handleChange(e.currentTarget.value)}
      >
        <option value="small">Kecil</option>
        <option value="big">Besar</option>
      </select>
      <Spinner when={pending} />
      <TextError>{error?.message ?? null}</TextError>
    </div>
  );
}
