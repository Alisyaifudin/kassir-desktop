import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { toast } from "sonner";
import { useSize } from "~/hooks/use-size";
import { useState } from "react";
import { store } from "~/store-effect";
import { Effect, pipe } from "effect";
import { log } from "~/lib/utils";
import { sizeStore } from "~/layouts/root/Provider";
import { Size } from "~/store-effect/size/get";
import { revalidate } from "~/hooks/use-micro";

export function SelectSize() {
  const size = useSize();
  const { loading, handleChange, error } = useChange(size);
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

export function useChange(size: Size) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleChange = async (e: string) => {
    if (e !== "big" && e !== "small") {
      toast.error("Pilihan tidak valid");
      return;
    }
    sizeStore.set(e);
    setLoading(true);
    const error = await pipe(
      store.size.set(e),
      Effect.map(() => {
        revalidate("shop");
        return null;
      }),
      Effect.catchTag("StoreError", ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.succeed(e.message);
      }),
      Effect.runPromise,
    );
    setLoading(false);
    setError(error);
    if (error !== null) {
      sizeStore.set(size);
    }
  };
  return { loading, error, handleChange };
}
