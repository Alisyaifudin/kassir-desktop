import { Effect } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Cashier, CashierService } from "~/services/cashier";

export const nameFormEffect = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const update = (id: string, name: string) =>
    program(id, name).pipe(Effect.provideService(CashierService, cashierService));
  return function NameForm() {
    const user = cashierService.current.useUser();
    const { loading, error, input, handleInput, handleSubmit } = useNameForm(update, user);
    return (
      <form onSubmit={handleSubmit} className="flex-col gap-2 flex">
        <label className="grid grid-cols-[150px_1fr] gap-2 text-normal items-center">
          <span>Nama</span>
          <Input
            disabled={loading}
            value={input}
            onChange={(e) => handleInput(e.currentTarget.value)}
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
  };
});

function program(id: string, name: string) {
  return Effect.gen(function* () {
    const service = yield* CashierService;
    yield* service.update.name(id, name);
    service.current.setUser({ ...service.current.user!, name });
    return null;
  }).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message)));
}

function useNameForm(
  update: (id: string, name: string) => Effect.Effect<string | null>,
  user: Cashier,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState(user.name);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await Effect.runPromise(update(user.id, input));
    setLoading(false);
    setError(err);
  }

  function handleInput(value: string) {
    setInput(value);
  }

  return { loading, error, input, handleInput, handleSubmit };
}
