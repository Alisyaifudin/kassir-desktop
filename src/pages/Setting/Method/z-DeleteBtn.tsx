import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { X } from "lucide-react";
import { TextError } from "~/components/TextError";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Spinner } from "~/components/Spinner";
import { Method } from "~/database/method/get-all";
import { useSubmit } from "~/hooks/use-submit";
import { Effect, pipe } from "effect";
import { db } from "~/database-effect";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const DeleteBtn = memo(function ({ method }: { method: Method }) {
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    () => Effect.runPromise(program(method.id)),
    () => {
      setOpen(false);
      revalidate(KEY);
    },
  );
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button type="button" asChild className="rounded-full p-2" variant="destructive">
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-3xl">Hapus Catatan</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-3xl">
            <DialogDescription>Hapus metode: {method.name}?</DialogDescription>
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button variant="destructive">
                Hapus
                <Spinner when={loading} />
              </Button>
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});

function program(id: number) {
  return pipe(
    db.method.delById(id),
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
