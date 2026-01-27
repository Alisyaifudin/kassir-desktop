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
import { cn, log } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { useState } from "react";
import { Effect } from "effect";
import { validate } from "~/lib/validate";
import { z } from "zod";
import { auth } from "~/lib/auth-effect";
import { db } from "~/database-effect";

export function PasswordForm() {
  const size = useSize();
  const { handleSubmit, loading, error } = useSubmit();
  return (
    <Accordion type="single" collapsible className="bg-red-400 text-white">
      <AccordionItem value="item-1">
        <AccordionTrigger className="font-bold px-2">Ganti kata sandi</AccordionTrigger>
        <AccordionContent>
          <form onSubmit={handleSubmit} className="flex-col gap-2 flex px-2 ">
            <input type="hidden" name="action" value="change-password"></input>
            <label className={cn("grid gap-2 items-center text-normal", css.password[size])}>
              <span>Kata Sandi Baru</span>
              <Password name="password" aria-autocomplete="list" />
            </label>
            <Button className="w-fit self-end">
              Simpan <Spinner when={loading} />
            </Button>
            <TextError>{error}</TextError>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = auth.get()?.name;
    if (name === undefined) return;
    const form = e.currentTarget;
    const formdata = new FormData(form);
    setLoading(true);
    const error = await Effect.runPromise(program(name, formdata));
    setLoading(false);
    setError(error);
  }
  return { loading, error, handleSubmit };
}

function program(name: string, formdata: FormData) {
  return Effect.gen(function* () {
    const password = yield* validate(z.string(), formdata.get("password"));
    const hash = yield* auth.hash(password);
    yield* db.cashier.update.hash(name, hash);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.succeed(e.message);
      },
      ZodValError: (e) => {
        return Effect.succeed(e.error.message);
      },
      InvokeError: (e) => {
        log.error(JSON.stringify(e.e.stack));
        return Effect.succeed(e.msg);
      },
    }),
  );
}

// const parsed = z.string().safeParse(formdata.get("password"));
// if (!parsed.success) {
//   return parsed.error.message;
// }
// const password = parsed.data;
// const [errHash, hash] = await auth.hash(password);
// if (errHash) return errHash;
// const user = auth.user();
// const errMsg = await db.cashier.update.hash(user.name, hash);
// return errMsg ?? undefined;
