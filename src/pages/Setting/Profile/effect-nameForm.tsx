import { Effect } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Cashier, CashierService } from "~/services/cashier";
import { UserService } from "~/services/user";

export const nameFormEffect = Effect.gen(function* () {
  const userService = yield* UserService;
  const cashierService = yield* CashierService;
  const update = (id: string, name: string) =>
    Effect.runPromise(
      program(id, name).pipe(
        Effect.provideService(CashierService, cashierService),
        Effect.provideService(UserService, userService),
      ),
    );
  const useUser = () => userService.useUser();
  return function NameForm() {
    const user = useUser();
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
    const cashierService = yield* CashierService;
    const userService = yield* UserService;
    const error = yield* Effect.promise(() => cashierService.set.name(id, name));
    if (error !== null) {
      return error;
    }
    const currentUser = userService.user;
    if (!currentUser) return "Pengguna tidak ditemukan";
    userService.setUser({ ...currentUser, name });
    return null;
  });
}

function useNameForm(update: (id: string, name: string) => Promise<string | null>, user: Cashier) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState(user.name);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await update(user.id, input);
    setLoading(false);
    setError(err);
  }

  function handleInput(value: string) {
    setInput(value);
  }

  return { loading, error, input, handleInput, handleSubmit };
}
