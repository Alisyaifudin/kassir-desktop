import { Effect } from "effect";
import { MoneyService } from "~/services/money";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { z } from "zod";

export const nameForm = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const onUpdateFunc = (id: string, name: string) => moneyService.pocket.set.name(id, name);
  return function Name({ name, pocketId }: { pocketId: string; name: string }) {
    const onUpdate = useCallback((name: string) => onUpdateFunc(pocketId, name), [pocketId]);
    const { handleSubmit, loading } = useUpdateName(onUpdate);
    return (
      <form className="flex-1 flex items-center" onSubmit={handleSubmit}>
        <input
          defaultValue={name}
          name="name"
          className="text-big focus:outline-none border-0 min-h-17 small:min-h-12 w-full"
        />
        <Spinner when={loading} />
      </form>
    );
  };
});

function useUpdateName(onUpdate: (name: string) => Promise<string | null>) {
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formdata = new FormData(e.currentTarget);
    const parsed = z
      .string("Harus ada")
      .trim()
      .nonempty("Harus ada")
      .max(20, "Maksimal 20 karakter")
      .safeParse(formdata.get("name"));
    if (!parsed.success) {
      toast.error(parsed.error.message);
      return;
    }
    const name = parsed.data;
    setLoading(true);
    const errMsg = await onUpdate(name);
    setLoading(false);
    if (errMsg === null) {
      toast.success("Berhasil diperbarui");
    } else {
      toast.error(errMsg);
    }
  }
  return { loading, handleSubmit };
}
