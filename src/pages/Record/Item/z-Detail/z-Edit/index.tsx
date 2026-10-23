import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { TextError } from "~/components/TextError";
import { Separator } from "~/components/ui/separator";
import { useUser } from "~/hooks/use-user";
import type { RecordFull } from "~/services/record";
import { useSaveEdit } from "./use-edit";
import { ChangeMode } from "./z-ChangeMode";
import { MethodField } from "./z-Method";
import { ToCredit } from "./z-ToCredit";

export function EditDialog({ record }: { record: RecordFull }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const edit = useSaveEdit(record, close, open);
  // Flipping the mode replaces the record and moves stock, the same weight as
  // moving its dates — an admin correction, not day-to-day cashier work.
  const isAdmin = useUser().role === "admin";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" asChild className="w-fit">
        <DialogTrigger type="button">Edit</DialogTrigger>
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-big">Sunting catatan</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Ubah metode pembayaran atau catatan pada catatan riwayat ini.
          {isAdmin
            ? " Mengubah mode membuat catatan baru dengan isi yang sama, lalu menghapus yang lama."
            : null}
        </DialogDescription>
        <div className="flex flex-col gap-4 py-2">
          {/* A split payment has no single method to correct, so the picker is
              withheld rather than made to guess which half the cashier meant. */}
          {edit.methodId === null ? null : (
            <MethodField
              methodId={edit.methodId}
              onChange={edit.setMethodId}
              disabled={edit.loading}
            />
          )}
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
          {/* Moving a record out of its mode is a different kind of edit: it
              replaces the record instead of rewriting it, so it sits apart from
              the fields above rather than beside Simpan. */}
          {isAdmin ? (
            <div className="flex flex-col gap-4">
              <Separator />
              <ChangeMode record={record} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
