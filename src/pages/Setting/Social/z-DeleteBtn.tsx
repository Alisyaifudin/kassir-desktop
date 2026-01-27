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
import { cn, log, sizeClass } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { Effect } from "effect";
import { db } from "~/database-effect";
import { revalidate } from "~/hooks/use-micro";
import { useSubmit } from "~/hooks/use-submit";
import { Spinner } from "~/components/Spinner";
import { KEY } from "./loader";

export const DeleteBtn = memo(function ({
  id,
  name,
  value,
}: {
  id: number;
  name: string;
  value: string;
}) {
  const size = useSize();
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      e.stopPropagation();
      return Effect.runPromise(program(id));
    },
    () => {
      setOpen(false);
      revalidate(KEY);
    },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        asChild
        className={cn("w-fit p-0 rounded-full", css.delete[size].iconBtn)}
        variant="destructive"
      >
        <DialogTrigger>
          <X className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader className={sizeClass[size]}>
          <DialogTitle className="text-big">Hapus Kontak</DialogTitle>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className={cn("grid", css.delete[size].grid)}>
              <p>Nama</p>
              <p>: {name}</p>
            </div>
            <div className={cn("grid", css.delete[size].grid)}>
              <p>Isian</p>
              <p>: {value}</p>
            </div>
            <TextError>{error}</TextError>
            <div className="col-span-2 flex flex-col items-end">
              <Button variant="destructive" type="submit">
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
  return Effect.gen(function* () {
    yield* db.social.delById(id);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        console.error(e);
        log.error(JSON.stringify(e.stack));
        return Effect.succeed(e.message);
      },
    }),
  );
}
