import { X } from "lucide-react";
import { Button } from "~/components/ui/button";

/**
 * Drops a draft that was never committed. Nothing is in the db or on disk yet, so
 * this is local and immediate: no confirmation, and no reason to hide it behind the
 * admin-only rule the saved-image delete uses - whoever picked the file must be able
 * to take it back.
 */
export function DiscardDraft({ onDiscard }: { onDiscard: () => void }) {
  return (
    <Button
      type="button"
      onClick={onDiscard}
      variant="destructive"
      className="rounded-full absolute top-1 right-0 p-1"
      aria-label="Buang gambar"
    >
      <X className="size-5" />
    </Button>
  );
}
