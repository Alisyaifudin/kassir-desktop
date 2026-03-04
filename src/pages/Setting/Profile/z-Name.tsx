import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useUpdateName } from "./use-update-name";

export function Name() {
  const { loading, error, name, handleSubmit } = useUpdateName();
  return (
    <form onSubmit={handleSubmit} className="flex-col gap-2 flex">
      <label className="grid grid-cols-[150px_1fr] gap-2 text-normal items-center">
        <span>Nama</span>
        <Input
          disabled={loading}
          value={name.value}
          onChange={(e) => name.set(e.currentTarget.value)}
          required
          aria-autocomplete="list"
        />
      </label>
      <Button className="w-fit self-end" disabled={loading}>
        Simpan <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </form>
  );
}
