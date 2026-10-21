import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { TextError } from "~/components/TextError";
import type { RecordFull } from "~/services/record";
import { useSaveEdit } from "./use-edit";
import { ToCredit } from "./z-ToCredit";

export function EditDialog({ record }: { record: RecordFull }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const edit = useSaveEdit(record, close, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" asChild className="w-fit">
        <DialogTrigger type="button">Edit</DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-big">Sunting catatan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1">
            <span>Catatan</span>
            <Textarea
              value={edit.note}
              onChange={(event) => edit.setNote(event.currentTarget.value)}
              rows={4}
              disabled={edit.loading}
            />
          </label>
          <TextError>{edit.error}</TextError>
          <div className="flex items-center justify-between gap-3">
            {record.creditAt === null && record.mode === "outcoming" ? (
              <ToCredit id={record.id} onSuccess={close} />
            ) : (
              <span />
            )}
            <Button type="button" onClick={() => void edit.save()} disabled={edit.loading}>
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
