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
import { useMethod } from "./use-method";
import { Effect } from "effect";
import { isString, log } from "~/lib/utils";
import { db } from "~/database-effect";
import { useSubmit } from "~/hooks/use-submit";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const NewBtn = memo(function () {
  const [method] = useMethod();
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      const formdata = new FormData(e.currentTarget);
      return Effect.runPromise(program(method, formdata));
    },
    () => {
      setOpen(false);
      revalidate(KEY);
    },
  );
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="w-fit self-end" asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Tambahkan Jenis Pembayaran</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Input name="name" placeholder="Nama" aria-autocomplete="list" />
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
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

function program(kind: "transfer" | "debit" | "qris", formdata: FormData) {
  return Effect.gen(function* () {
    const name = formdata.get("name");
    if (!isString(name)) return null;
    yield* db.method.add(name, kind);
    return null;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
