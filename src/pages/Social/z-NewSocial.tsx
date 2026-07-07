import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { Field, FieldError } from "~/components/ui/field";
import { cn } from "~/lib/utils";

const schema = z.object({
  name: z.string().nonempty("Harus ada"),
  value: z.string().nonempty("Harus ada"),
});

type Props = {
  onAdd: (name: string, value: string) => Promise<string | null>;
};

export function NewSocial({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: { name: "", value: "" },
    validators: { onSubmit: schema },
    async onSubmit({ value }) {
      const errMsg = await onAdd(value.name, value.value);
      setError(errMsg);
      if (errMsg === null) {
        setOpen(false);
        form.reset();
      }
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kontak</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className={cn(
            "grid gap-2 items-center justify-end",
            "grid-cols-[250px_1fr] small:grid-cols-[210px_1fr]",
          )}
        >
          <form.Field name="name">
            {(field) => (
              <Field>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  disabled={field.form.state.isSubmitting}
                  onBlur={field.handleBlur}
                  placeholder="Nama Kontak"
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="value">
            {(field) => (
              <Field>
                <Input
                  name={field.name}
                  value={field.state.value}
                  disabled={field.form.state.isSubmitting}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  placeholder="Isian Kontak"
                  aria-autocomplete="list"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <div className="col-span-2 flex flex-col items-end">
            <TextError>{error}</TextError>
            <div className="flex justify-between w-full mt-5">
              <Button type="button" asChild variant="secondary">
                <DialogClose type="button">Batal</DialogClose>
              </Button>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    Tambah
                    <Spinner when={isSubmitting} />
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
