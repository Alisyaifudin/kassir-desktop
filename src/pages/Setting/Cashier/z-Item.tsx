import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { Cashier } from "~/database/cashier/get-all";
import { auth } from "~/lib/auth-effect";
import { SelectRole } from "./z-SelectRole";
import { useSubmit } from "~/hooks/use-submit";
import { isString, log } from "~/lib/utils";
import { db } from "~/database-effect";
import { Effect, pipe } from "effect";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const Item = memo(function ({ cashier }: { cashier: Cashier }) {
  const username = auth.user().name;
  const { loading, error, handleSubmit } = useSubmit(
    async (e) => {
      const formdata = new FormData(e.currentTarget);
      const newName = formdata.get("name");
      if (!isString(newName)) return null;
      return Effect.runPromise(program({ old: cashier.name, new: newName }));
    },
    () => revalidate(KEY),
  );
  if (username === cashier.name) {
    return (
      <div className="flex items-center justify-between pr-16">
        <p className="pl-3">{username}</p>
        <p>{title[cashier.role]}</p>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit} className="flex items-center px-0.5 gap-3">
      <Input type="text" defaultValue={cashier.name} name="name" aria-autocomplete="list" />
      <Spinner when={loading} />
      <TextError>{error}</TextError>
      <SelectRole cashier={cashier} />
      <DeleteBtn name={cashier.name} />
    </form>
  );
});

const title = {
  admin: "Admin",
  user: "User",
};

function program(input: { old: string; new: string }) {
  return pipe(
    db.cashier.update.name(input),
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
