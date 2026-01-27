import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { memo } from "react";
import { cn, integer, log } from "~/lib/utils";
import { Show } from "~/components/Show";
import { DeleteBtn } from "./z-DeleteBtn";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { Effect } from "effect";
import { z } from "zod";
import { validate } from "~/lib/validate";
import { db } from "~/database-effect";
import { useSubmit } from "~/hooks/use-submit";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const Item = memo(function ({
  id,
  name,
  value,
}: {
  id: number;
  name: string;
  value: string;
}) {
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      const formdata = new FormData(e.currentTarget);
      return Effect.runPromise(program(formdata));
    },
    () => revalidate(KEY),
  );
  const size = useSize();
  return (
    <form
      onSubmit={handleSubmit}
      className={cn("grid gap-2 py-0.5 px-0.5 items-center", css.item[size])}
    >
      <input type="hidden" name="id" value={id}></input>
      <Input name="name" defaultValue={name} placeholder="Nama Kontak" aria-autocomplete="list" />
      <Input
        name="value"
        defaultValue={value}
        placeholder="Isian Kontak"
        aria-autocomplete="list"
      />
      <button type="submit" className="hidden">
        Submit
      </button>
      <Show when={!loading} fallback={<Loader2 className="animate-spin" />}>
        <DeleteBtn id={id} name={name} value={value} />
      </Show>
      <TextError className="col-span-2">{error?.global}</TextError>
      <TextError>{error?.name}</TextError>
      <TextError>{error?.value}</TextError>
    </form>
  );
});

function program(formdata: FormData) {
  return Effect.gen(function* () {
    const { name, value, id } = yield* validate(schema, {
      name: formdata.get("name"),
      value: formdata.get("value"),
      id: formdata.get("id"),
    });
    yield* db.social.update(id, name, value);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.succeed({
          global: e.message,
          name: undefined,
          value: undefined,
        });
      },
      ZodValError: ({ error }) => {
        const errs = error.flatten().fieldErrors;
        return Effect.succeed({
          name: errs.name?.join("; "),
          value: errs.value?.join("; "),
          global: undefined,
        });
      },
    }),
  );
}

const schema = z.object({
  name: z.string().min(1, { message: "Harus ada" }),
  value: z.string().min(1, { message: "Harus ada" }),
  id: integer,
});
