import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { cn, log } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { Effect } from "effect";
import { z } from "zod";
import { validate } from "~/lib/validate";
import { db } from "~/database-effect";
import { revalidate } from "~/hooks/use-micro";
import { useSubmit } from "~/hooks/use-submit";
import { KEY } from "./loader";

export const NewItem = memo(function () {
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      const formdata = new FormData(e.currentTarget);
      return Effect.runPromise(program(formdata));
    },
    () => {
      setOpen(false);
      revalidate(KEY);
    },
  );
  const size = useSize();
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kontak</DialogTitle>
          <form
            onSubmit={handleSubmit}
            className={cn("grid gap-2 items-center justify-end", css.newItem[size])}
          >
            <Input name="name" placeholder="Nama Kontak" aria-autocomplete="list" />
            <Input name="value" placeholder="Isian Kontak" aria-autocomplete="list" />
            {error ? (
              <>
                <TextError>{error?.name}</TextError>
                <TextError>{error?.value}</TextError>
              </>
            ) : null}
            <div className="col-span-2 flex flex-col items-end">
              <TextError>{error?.global}</TextError>
              <Button>
                Tambah
                <Spinner when={loading} />
              </Button>
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});

function program(formdata: FormData) {
  return Effect.gen(function* () {
    const { name, value } = yield* validate(schema, {
      name: formdata.get("name"),
      value: formdata.get("value"),
    });
    yield* db.social.add(name, value);
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
});
