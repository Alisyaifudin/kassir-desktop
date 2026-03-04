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
import { cn } from "~/lib/utils";
import { useNew } from "./use-new";
import { Field, FieldError } from "~/components/ui/field";

export const NewItem = memo(function () {
  const [open, setOpen] = useState(false);
  const { form, error } = useNew(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>Tambah</DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Kontak</DialogTitle>
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
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button disabled={isSubmitting}>
                    Tambah
                    <Spinner when={isSubmitting} />
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
});
