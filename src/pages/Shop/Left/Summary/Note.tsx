import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { NotepadText } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { basicStore } from "../../use-transaction";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction";
import { useTab } from "../../use-tab";
import { useAtom } from "@xstate/store/react";

function setNote(note: string) {
  basicStore.set((prev) => ({ ...prev, note }));
}

export function Note() {
  const note = useAtom(basicStore, (state) => state.note);
  const [tab] = useTab();
  const saveNote = useDebouncedCallback((note: string) => {
    if (tab === undefined) return;
    queue.add(() => tx.transaction.update.note(tab, note));
  }, DEBOUNCE_DELAY);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.currentTarget.value;
    setNote(v);
    saveNote(v);
  };
  return (
    <Dialog>
      <Button className="p-1 rounded-full" asChild variant="secondary">
        <DialogTrigger type="button">
          <NotepadText className="icon" />
        </DialogTrigger>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-big">Catatan</DialogTitle>
        </DialogHeader>
        <Textarea value={note} onChange={handleChange} rows={3} />
      </DialogContent>
    </Dialog>
  );
}
