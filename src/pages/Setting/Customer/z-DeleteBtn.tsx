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
import { useSubmit } from "~/hooks/use-submit";
import { Effect, pipe } from "effect";
import { db } from "~/database-effect";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const DeleteBtn = memo(function ({
  id,
  name,
  phone,
}: {
  id: number;
  name: string;
  phone: string;
}) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      e.stopPropagation();
      return pipe(
        db.customer.delById(id),
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
      <Button className="p-2 rounded-full" type="button" asChild variant="destructive">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-normal">Yakin?</DialogTitle>
          <DialogDescription className="text-small">Kamu akan menghapus:</DialogDescription>
          <DialogDescription className="text-small">
            {">"} Nama: {name}
          </DialogDescription>
          <DialogDescription className="text-small">
            {">"} HP: {phone}
          </DialogDescription>
          <form onSubmit={handleSubmit} className="flex justify-between mt-5">
            <Button type="button" asChild>
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
