import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { toast } from "sonner";
import { setSize, useSize } from "~/hooks/use-size";
import { useState } from "react";

export function SelectSize() {
  const size = useSize();
  const { loading, handleChange, error } = useChange();
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
      <Spinner when={loading} />
      <TextError>{error}</TextError>
    </div>
  );
}

export function useChange() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleChange = async (e: string) => {
    if (e !== "big" && e !== "small") {
      toast.error("Pilihan tidak valid");
      return;
    }
    setSize(e);
    setLoading(true);
    const error = await setSize(e);
    setLoading(false);
    setError(error);
  };
  return { loading, error, handleChange };
}
