import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useState } from "react";
import { TextError } from "~/components/TextError";
import { SelectType } from "./z-SelectType";
import { Spinner } from "~/components/Spinner";
import { Textarea } from "~/components/ui/textarea";
import { Plus } from "lucide-react";
import { NewMoney, PocketBase } from "~/services/money/type";
import { NumberField } from "~/components/NumberField";
import z from "zod";
import { useForm } from "@tanstack/react-form";
import { Effect } from "effect";
import { MoneyService } from "~/services/money";

export const newRecord = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const onNew = (money: NewMoney) => moneyService.money.add.one(money);
  return function NewItem({ pocket }: { pocket: PocketBase }) {
    const [open, setOpen] = useState(false);
    const { form, error } = useNew(pocket, onNew, () => setOpen(false));
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
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  };
});

const schema = z.object({
  value: z.string().refine((r) => {
    const num = Number(r);
    return !isNaN(num) && isFinite(num);
  }),
  type: z.enum(["absolute", "change"]),
  note: z.string(),
});

export function useNew(
  pocket: PocketBase,
  onNew: (money: NewMoney) => Promise<string | null>,
  onClose: () => void,
) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: {
      value: "",
      type: pocket.type,
      note: "",
    },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value: v }) {
      const value = Number(v.value);
      const { note, type } = v;
      const errMsg = await onNew({ note, type, pocketId: pocket.id, value });
      setError(errMsg);
      if (errMsg === null) {
        onClose();
        form.reset();
      }
    },
  });
  return { error, form };
}
