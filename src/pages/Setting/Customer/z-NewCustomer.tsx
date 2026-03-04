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
import { useNew } from "./use-new";
import { Field, FieldError, FieldGroup } from "~/components/ui/field";

export const NewCustomer = memo(function () {
  const [open, setOpen] = useState(false);
  const { form, error } = useNew(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>
          Tambah Pelanggan <Plus />
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Pelanggan</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-2"
        >
          <FieldGroup className="grid grid-cols-[250px_1fr] small:grid-cols-[210px_1fr]">
            <form.Field name="name">
              {(field) => (
                <Field>
                  <Input
                    required
                    id={`input-${field.name}`}
                    placeholder="Nama"
                    name={field.name}
                    disabled={field.form.state.isSubmitting}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                    onBlur={field.handleBlur}
                    aria-autocomplete="list"
                  />
                  <FieldError errors={field.state.meta.errors}></FieldError>
                </Field>
              )}
            </form.Field>
            <form.Field name="phone">
              {(field) => (
                <Field>
                  <Input
                    id={`input-${field.name}`}
                    name={field.name}
                    placeholder="No. Hp"
                    disabled={field.form.state.isSubmitting}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                    onBlur={field.handleBlur}
                    aria-autocomplete="list"
                  />
                  <FieldError errors={field.state.meta.errors}></FieldError>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <TextError>{error}</TextError>
          <div className="flex justify-between mt-5">
            <Button type="button" asChild variant={"secondary"}>
              <DialogClose type="button">Batal</DialogClose>
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting}>
                  Tambahkan <Spinner when={isSubmitting} />
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});
