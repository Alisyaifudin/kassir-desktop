import { NotepadText } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";

/**
 * The record's note, behind an icon: optional, so it must not take a row of its
 * own. The trigger turns into `secondary` once there is something to read, so a
 * written note is visible without opening the dialog.
 */
export function Note({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const written = value.trim() !== "";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={written ? "secondary" : "outline"}
          aria-label={written ? "Catatan (terisi)" : "Catatan"}
          title={written ? "Catatan (terisi)" : "Catatan"}
        >
          <NotepadText aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Catatan</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Catatan untuk transaksi ini; ikut tersimpan di record.
        </DialogDescription>
        <Textarea
          rows={5}
          value={value}
          placeholder="Catatan transaksi..."
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Selesai</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
