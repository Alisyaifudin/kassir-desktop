import { Effect } from "effect";
import { useState } from "react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { CashierService } from "~/services/cashier";

const schema = z.object({
  name: z.string().nonempty(),
});

export const newCashierEffect = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  const add = (name: string) => cashierService.add({ name, role: "user", password: "" });
  return function NewCashier() {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const form = useForm({
      defaultValues: { name: "" },
      validators: { onSubmit: schema },
      async onSubmit({ value }) {
        const error = await Effect.runPromise(
          add(value.name).pipe(
            Effect.as(null),
            Effect.catchAll((e) => Effect.succeed(e)),
          ),
        );
        setError(error);
      },
    });
    return (
      <Dialog open={open} onOpenChange={setOpen}>
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
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field name="name">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor={`input-${field.name}`}>Nama</FieldLabel>
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
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
              <TextError>{error}</TextError>
            </FieldGroup>
            <div className="flex justify-between mt-5">
              <Button asChild variant="secondary">
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
        </DialogContent>
      </Dialog>
    );
  };
});
