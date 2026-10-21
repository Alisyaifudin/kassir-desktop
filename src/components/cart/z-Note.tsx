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
import { service } from "~/services";
import type { Draft } from "~/services/transaction";
import { run } from "~/components/cart/run";

/**
 * A free-text note carried onto the record — "titip nota ke Bu Sari". Optional,
 * so it lives behind a trigger and writes straight to the draft.
 */
export function Note({ draft }: { draft: Draft }) {
  return (
    <Dialog>
      <Button asChild variant="secondary">
        <DialogTrigger type="button" title="Catatan">
          <NotepadText className="icon" />
          Catatan
        </DialogTrigger>
      </Button>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-big">Catatan</DialogTitle>
        </DialogHeader>
        <Textarea
          rows={5}
          value={draft.note}
          placeholder="Catatan pembelian..."
          onChange={(event) => run(service.transaction.set.note(draft.id, event.currentTarget.value))}
        />
      </DialogContent>
    </Dialog>
  );
}
