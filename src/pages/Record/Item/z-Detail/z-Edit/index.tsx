import { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { SelectMethod } from "./SelectMethod";
import { SelectMode } from "./SelectMode";
import { ToCreditBtn } from "./ToCreditBtn";
import { Show } from "~/components/Show";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { MethodFull } from "~/database/method/get-all";
import { useNote } from "./use-note";
import { Textarea } from "~/components/ui/textarea";

export function EditDialog({
  method,
  mode,
  note: noteRaw,
  isCredit,
  timestamp,
}: {
  timestamp: number;
  mode: DB.Mode;
  note: string;
  isCredit: boolean;
  method: MethodFull;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const { loading, error, handleSubmit, note, setNote } = useNote(timestamp, noteRaw, close);
  return (
    <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
      <Button variant="outline" asChild className="w-fit">
        <DialogTrigger type="button">Edit</DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-5xl">Sunting catatan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-5">
          <Show when={!isCredit}>
            <SelectMode close={close} mode={mode} timestamp={timestamp} />
          </Show>
          <SelectMethod timestamp={timestamp} method={method} close={close} />
          <form
            id="record-note"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="action" value="edit-note"></input>
            <label className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <p>Catatan:</p>
              </div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                name="note"
                rows={3}
              />
            </label>
            <TextError>{error}</TextError>
          </form>
          <div className="flex items-center justify-between">
            <Show when={!isCredit && mode === "buy"} fallback={<div />}>
              <ToCreditBtn close={close} timestamp={timestamp} />
            </Show>
            <Button form="record-note">
              Simpan
              <Spinner when={loading} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
