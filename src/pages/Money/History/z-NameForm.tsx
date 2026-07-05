import { useCallback, useState } from "react";
import { Spinner } from "~/components/Spinner";
import { SonnerService } from "~/services/sonner";
import z from "zod";

type Props = {
  pocketId: string;
  name: string;
  sonner: typeof SonnerService.Type;
  onUpdate: (pocketId: string, name: string) => Promise<string | null>;
};

export function NameForm({ pocketId, name, sonner, onUpdate }: Props) {
  const doUpdate = useCallback(
    (newName: string) => onUpdate(pocketId, newName),
    [pocketId, onUpdate],
  );
  const { handleSubmit, loading } = useUpdateName(doUpdate, sonner);

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
}

function useUpdateName(onUpdate: (name: string) => Promise<string | null>, sonner: typeof SonnerService.Type) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formdata = new FormData(e.currentTarget);
    const parsed = z
      .string()
      .trim()
      .nonempty("Harus ada")
      .max(20, "Maksimal 20 karakter")
      .safeParse(formdata.get("name"));
    if (!parsed.success) {
      sonner.error(parsed.error.issues[0]?.message ?? "Harus ada");
      return;
    }
    const name = parsed.data;
    setLoading(true);
    const errMsg = await onUpdate(name);
    setLoading(false);
    if (errMsg === null) {
      sonner.success("Berhasil diperbarui");
    } else {
      sonner.error(errMsg);
    }
  }

  return { loading, handleSubmit };
}
