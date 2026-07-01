import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { Password } from "~/components/Password";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { CashierService } from "~/services/cashier";
import { HashService } from "~/services/hash";
import { UserService } from "~/services/user";

export const passwordFormEffect = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const hashService = yield* HashService;
  const userService = yield* UserService;
  const update = (id: string, password: string) =>
    Effect.runPromise(
      program(id, password).pipe(
        Effect.provideService(CashierService, cashierService),
        Effect.provideService(HashService, hashService),
      ),
    );
  return function PasswordForm() {
    const user = userService.useUser();
    const { loading, error, input, handleInput, handleSubmit } = usePasswordForm(update, user.id);
    return (
      <Accordion type="single" collapsible className="text-white">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-bold px-2">Ganti kata sandi</AccordionTrigger>
          <AccordionContent>
            <form onSubmit={handleSubmit} className="flex-col gap-2 flex px-2">
              <label
                className={cn(
                  "grid gap-2 items-center text-normal",
                  "grid-cols-[250px_1fr] small:grid-cols-[160px_1fr]",
                )}
              >
                Kata Sandi Baru
                <Password
                  value={input}
                  disabled={loading}
                  onChange={(e) => handleInput(e.currentTarget.value)}
                  name="password"
                  aria-autocomplete="list"
                />
              </label>
              <Button disabled={loading} className="w-fit self-end">
                Simpan <Spinner when={loading} />
              </Button>
              <TextError>{error}</TextError>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };
});

function program(id: string, password: string) {
  return Effect.gen(function* () {
    const cashierService = yield* CashierService;
    const hashService = yield* HashService;
    const hash = yield* hashService.hash(password);
    const error = yield* Effect.promise(() => cashierService.set.hash(id, hash));
    if (error !== null) {
      return error;
    }
    return null;
  }).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message)));
}

function usePasswordForm(update: (id: string, password: string) => Promise<string | null>, userId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [input, setInput] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const err = await update(userId, input);
    setLoading(false);
    setError(err);
    if (err === null) {
      setInput("");
      toast.success("Berhasil diperbarui");
    }
  }

  function handleInput(value: string) {
    setInput(value);
  }

  return { loading, error, input, handleInput, handleSubmit };
}
