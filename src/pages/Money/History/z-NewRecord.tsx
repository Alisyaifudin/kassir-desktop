import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { memo, useState } from "react";
import { TextError } from "~/components/TextError";
import { SelectType } from "./z-SelectType";
import { NumberField } from "~/components/NumberField";
import { Spinner } from "~/components/Spinner";
import { Textarea } from "~/components/ui/textarea";
import { useNew } from "./use-new";
import { Plus } from "lucide-react";
import type { Pocket } from "~/services/money";
import equal from "fast-deep-equal";

export const NewRecord = memo(function NewRecord({ pocket }: { pocket: Pocket }) {
  const [open, setOpen] = useState(false);
  const { form, error } = useNew(pocket, () => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild>
        <DialogTrigger>
          <Plus />
          Catatan Baru
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-big">Tambah Catatan Keuangan Baru</DialogTitle>
          <DialogDescription>
            Catatan pemasukan atau pengeluaran pada kantong yang sedang dibuka.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <form.Field name="value">
              {(field) => (
                <NumberField
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  name="value"
                  placeholder="Nilai"
                  aria-autocomplete="list"
                />
              )}
            </form.Field>
            <form.Field name="type">
              {(field) => <SelectType type={field.state.value} onChange={field.handleChange} />}
            </form.Field>
          </div>
          <TextError>{error}</TextError>
          <form.Field name="note">
            {(field) => (
              <Textarea
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                name="note"
                placeholder="Catatan"
              />
            )}
          </form.Field>
          <div className="col-span-2 flex flex-col items-end">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button>
                  Tambah
                  <Spinner when={isSubmitting} />
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}, equal);
