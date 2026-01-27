import { memo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { useSubmit } from "~/hooks/use-submit";
import { isString, log } from "~/lib/utils";
import { db } from "~/database-effect";
import { Effect } from "effect";
import { auth } from "~/lib/auth-effect";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const NewCashier = memo(function () {
  const [open, setOpen] = useState(false);
  const { error, loading, handleSubmit } = useSubmit(
    async (e) => {
      const formdata = new FormData(e.currentTarget);
      return Effect.runPromise(program(formdata));
    },
    () => {
      revalidate(KEY);
      setOpen(false);
    },
  );
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>
          Tambah Kasir <Plus />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kasir</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <label className="grid grid-cols-[100px_1fr] text-normal items-center">
            <span>Nama:</span>
            <Input type="text" name="name" aria-autocomplete="list" />
          </label>
          <div className="flex justify-between mt-5">
            <Button asChild variant={"secondary"}>
              <DialogClose type="button">Batal</DialogClose>
            </Button>
            <Button>
              Tambahkan <Spinner when={loading} />
            </Button>
          </div>
        </form>
        <TextError>{error}</TextError>
      </DialogContent>
    </Dialog>
  );
});

function program(formdata: FormData) {
  return Effect.gen(function* () {
    const name = formdata.get("name");
    if (!isString(name)) return null;
    const hash = yield* auth.hash("");
    yield* db.cashier.add({ name, role: "user", hash });
    return null;
  }).pipe(
    Effect.catchAll(({ e }) => {
      log.error(e.message);
      return Effect.succeed(e.message);
    }),
  );
}
