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
import { useStoreValue } from "@simplestack/store/react";
import { useDebouncedCallback } from "use-debounce";
import { DEBOUNCE_DELAY } from "~/lib/constants";
import { queue } from "../../utils/queue";
import { tx } from "~/transaction";
import { useTab } from "../../use-tab";

export function Note() {
  const note = useStoreValue(basicStore.select("note"));
  const [tab] = useTab();
  const saveNote = useDebouncedCallback((note: string) => {
    queue.add(() => tx.transaction.update.note(tab, note));
  }, DEBOUNCE_DELAY);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    basicStore.select("note").set(e.currentTarget.value);
    saveNote(e.currentTarget.value);
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
