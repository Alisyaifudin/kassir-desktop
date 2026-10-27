import { ArrowLeftRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { cn } from "~/lib/utils";
import type { Draft, DraftMode } from "~/services/transaction";
import { useFlipMode } from "./use-flip-mode";

/** The other side of the cart, and what that side calls the move. */
const NEXT: Record<DraftMode, DraftMode> = { incoming: "outcoming", outcoming: "incoming" };

const LABELS: Record<DraftMode, string> = {
  outcoming: "Jadikan transaksi stok",
  incoming: "Jadikan transaksi toko",
};

const HINTS: Record<DraftMode, string> = {
  outcoming: "Keranjang ini berisi barang yang dibeli dari pemasok, bukan dijual ke pembeli.",
  incoming: "Keranjang ini berisi barang yang dijual ke pembeli, bukan dibeli dari pemasok.",
};

/**
 * The buried way out of a cart that was opened on the wrong screen: goods rung
 * up as a sale that turn out to be a purchase, or the reverse.
 *
 * It is deliberately quiet — a ghost button, not a stage or a strip button —
 * because the mistake is rare and the move is one click to undo from the other
 * side. The cart keeps everything it holds (lines, charges, payments, pictures)
 * and simply changes hands, so the button only has to say which side it goes to;
 * see `useFlipMode`.
 */
export function FlipMode({ draft, className }: { draft: Draft; className?: string }) {
  const next = NEXT[draft.mode];
  const { loading, error, flip } = useFlipMode(draft.id);

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-sm text-muted-foreground hover:text-foreground"
        title={HINTS[next]}
        disabled={loading}
        onClick={() => void flip(next)}
      >
        <ArrowLeftRight className="size-5" />
        {LABELS[next]}
      </Button>
      <TextError>{error}</TextError>
    </div>
  );
}
