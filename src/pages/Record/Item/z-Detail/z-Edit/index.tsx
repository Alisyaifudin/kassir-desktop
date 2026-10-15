import { useState } from "react";
import { Loader } from "~/components/Loader";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import { TextError } from "~/components/TextError";
import type { RecordFull } from "~/services/record";
import { InlineError, MethodErrorBoundary } from "../../z-Error";
import { groupMethods, useMethods, useSaveEdit } from "./use-edit";
import { MethodRows } from "./z-MethodRows";
import { ModeSelect } from "./z-Mode";
import { ToCredit } from "./z-ToCredit";

export function EditDialog({ record }: { record: RecordFull }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const edit = useSaveEdit(record, close, open);
  const methods = useMethods();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" asChild className="w-fit">
        <DialogTrigger type="button">Edit</DialogTrigger>
      </Button>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-big">Sunting catatan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {!record.isCredit ? (
            <ModeSelect mode={edit.mode} setMode={edit.setMode} disabled={edit.loading} />
          ) : null}
          <MethodErrorBoundary fallback={InlineError}>
            <Loader res={methods} fallback={<Skeleton className="h-20 w-full" />}>
              {({ data }) => (
                <MethodRows
                  rows={edit.rows}
                  groups={groupMethods(data)}
                  paid={edit.paid}
                  disabled={edit.loading}
                  lockAmounts={record.isCredit}
                  canSplit={!record.isCredit}
                  addRow={edit.addRow}
                  removeRow={edit.removeRow}
                  setRow={edit.setRow}
                />
              )}
            </Loader>
          </MethodErrorBoundary>
          <label className="flex flex-col gap-1">
            <span>Catatan</span>
            <Textarea
              value={edit.note}
              onChange={(event) => edit.setNote(event.currentTarget.value)}
              rows={3}
              disabled={edit.loading}
            />
          </label>
          <TextError>
            {!record.isCredit && edit.shortfall > 0
              ? `Pembayaran kurang Rp${edit.shortfall.toLocaleString("id-ID")}`
              : null}
          </TextError>
          <TextError>{edit.error}</TextError>
          <div className="flex items-center justify-between gap-3">
            {!record.isCredit && edit.mode === "outcoming" ? (
              <ToCredit id={record.id} onSuccess={close} />
            ) : <span />}
            <Button type="button" onClick={() => void edit.save()} disabled={edit.loading}>
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
