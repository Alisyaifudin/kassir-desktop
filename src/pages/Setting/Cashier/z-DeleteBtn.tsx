import { X } from "lucide-react";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/Spinner";
import { db } from "~/database-effect";
import { useSubmit } from "~/hooks/use-submit";
import { Effect, pipe } from "effect";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const DeleteBtn = memo(function ({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      e.stopPropagation();
      return pipe(
        db.cashier.delete(name),
        Effect.as(null),
        Effect.catchTag("DbError", ({ e }) => {
          log.error(JSON.stringify(e.stack));
          return Effect.succeed(e.message);
        }),
        Effect.runPromise,
      );
    },
    () => {
      revalidate(KEY);
      setOpen(false);
    },
  );
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button className="rounded-full p-2" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Yakin?</DialogTitle>
          <DialogDescription>Kamu akan menghapus:</DialogDescription>
          <DialogDescription>
            {">"}
            {name}
          </DialogDescription>
          <form onSubmit={handleSubmit} className="flex justify-between mt-5">
            <Button asChild>
              <DialogClose>Batal</DialogClose>
            </Button>
            <Button variant="destructive">
              Hapus
              <Spinner when={loading} />
            </Button>
          </form>
          <TextError>{error}</TextError>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
