import React, { memo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useDebt } from "./use-debt";
import { FieldError, FieldLabel } from "~/components/ui/field";

export const DebtDialog = memo(function DebtDialog({
  grandTotal,
  timestamp,
}: {
  grandTotal: number;
  timestamp: number;
}) {
  const [open, setOpen] = useState(false);
  const { form, error, loading, total, change } = useDebt({
    timestamp,
    grandTotal,
    onClose: () => setOpen(false),
  });
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button asChild className="w-fit">
        <DialogTrigger>Bayar Kredit</DialogTrigger>
      </Button>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-big">Bayar Kredit</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-1"
        >
          <form.Field name="pay">
            {(field) => (
              <Field error={<FieldError errors={field.state.meta.errors} />}>
                <FieldLabel htmlFor={field.name}>Bayaran</FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  disabled={loading}
                  type="number"
                  name={field.name}
                  id={field.name}
                  className="w-full"
                  aria-autocomplete="list"
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="rounding">
            {(field) => (
              <Field error={<FieldError errors={field.state.meta.errors} />}>
                <FieldLabel htmlFor={field.name}>Pembulatan</FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  disabled={loading}
                  type="number"
                  name={field.name}
                  id={field.name}
                  className="w-full"
                  aria-autocomplete="list"
                />
              </Field>
            )}
          </form.Field>
          <div className="grid grid-cols-[150px_1fr]">
            <span>Total</span>
            <span>: Rp{total.toLocaleString("id-ID")}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span>Kembalian</span>
            <span className={cn({ "text-red-500": change < 0 })}>
              : Rp{change.toLocaleString("id-ID")}
            </span>
          </div>
          <TextError>{error}</TextError>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button disabled={isSubmitting || change < 0}>
                Bayar <Spinner when={isSubmitting} />
              </Button>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
});

function Field({ children, error }: { children: React.ReactNode; error: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[150px_1fr] items-center">{children}</div>
      {error}
    </div>
  );
}
