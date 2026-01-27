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
import { Effect } from "effect";
import { db } from "~/database-effect";
import { validate } from "~/lib/validate";
import { z } from "zod";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const NewCustomer = memo(function () {
  const [open, setOpen] = useState(false);
  const { loading, error, handleSubmit } = useSubmit(
    (e) => {
      e.stopPropagation();
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
          Tambah Pelanggan <Plus />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-normal">Tambah Pelanggan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="grid grid-cols-[100px_1fr] items-center">
            <span className="text-normal">Nama:</span>
            <Input type="text" name="name" aria-autocomplete="list" />
          </label>
          <TextError>{error?.name}</TextError>
          <label className="grid grid-cols-[100px_1fr] items-center">
            <span className="text-normal">Hp:</span>
            <Input type="number" name="phone" aria-autocomplete="list" />
          </label>
          <TextError>{error?.phone}</TextError>
          <TextError>{error?.global}</TextError>
          <div className="flex justify-between mt-5">
            <Button type="button" asChild variant={"secondary"}>
              <DialogClose type="button">Batal</DialogClose>
            </Button>
            <Button>
              Tambahkan <Spinner when={loading} />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

const schema = z.object({
  name: z.string().nonempty({ message: "Harus ada" }),
  phone: z.string(),
});

function program(formdata: FormData) {
  return Effect.gen(function* () {
    const { name, phone } = yield* validate(schema, {
      name: formdata.get("name"),
      phone: formdata.get("phone"),
    });
    yield* db.customer.add(name, phone);
    return null;
  }).pipe(
    Effect.catchTags({
      DbError: ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.succeed({
          global: e.message,
          name: undefined,
          phone: undefined,
        });
      },
      ZodValError: ({ error }) => {
        log.error(error.message);
        const errs = error.flatten().fieldErrors;
        return Effect.succeed({
          global: undefined,
          name: errs.name?.join("; "),
          phone: errs.phone?.join("; "),
        });
      },
    }),
  );
}
