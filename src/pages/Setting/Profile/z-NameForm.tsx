import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Cashier } from "~/services/cashier";

type Props = {
  user: Cashier;
  onUpdateName: (id: string, name: string) => Promise<string | null>;
};

export function NameForm({ user, onUpdateName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState(user.name);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await onUpdateName(user.id, input);
    setLoading(false);
    setError(err);
  }

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-2 flex">
      <label className="grid grid-cols-[150px_1fr] gap-2 text-normal items-center">
        <span>Nama</span>
        <Input
          disabled={loading}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
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
