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
import { useNewCashier } from "./use-new-cashier";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";

export const NewCashier = memo(function () {
  const [open, setOpen] = useState(false);
  const { error, form } = useNewCashier(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>
          Tambah Kasir <Plus />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kasir</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor={`select-${field.name}`}>Nama</FieldLabel>
                  <Input
                    required
                    disabled={field.form.state.isSubmitting}
                    id={`input-${field.name}`}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                    onBlur={field.handleBlur}
                    aria-autocomplete="list"
                  />
                  <FieldError errors={field.state.meta.errors}></FieldError>
                </Field>
              )}
            </form.Field>
            <TextError>{error}</TextError>
          </FieldGroup>
          <div className="flex justify-between mt-5">
            <Button asChild variant={"secondary"}>
              <DialogClose type="button">Batal</DialogClose>
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button className="w-fit self-end" disabled={isSubmitting}>
                  Tambahkan
                  <Spinner when={isSubmitting} />
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
        <TextError>{error}</TextError>
      </DialogContent>
    </Dialog>
  );
});

// function program(formdata: FormData) {
//   return Effect.gen(function* () {
//     const name = formdata.get("name");
//     if (!isString(name)) return null;
//     const hash = yield* auth.hash("");
//     yield* db.cashier.add({ name, role: "user", hash });
//     return null;
//   }).pipe(
//     Effect.catchAll(({ e }) => {
//       logOld.error(e.message);
//       return Effect.succeed(e.message);
//     }),
//   );
// }
