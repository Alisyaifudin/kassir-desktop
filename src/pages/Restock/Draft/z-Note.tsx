import { useState } from "react";
import { NotepadText } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { DRAFT } from "../mock";

/** A free-text note carried onto the record — "titip nota ke Bu Sari". */
export function Note() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="rounded-full p-1 z-10" asChild variant="secondary">
        <DialogTrigger type="button" title="Catatan">
          <NotepadText className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Catatan</DialogTitle>
        </DialogHeader>
        <Textarea defaultValue={DRAFT.note} rows={3} />
      </DialogContent>
    </Dialog>
  );
}
