import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import type { RecordFull } from "~/services/record";
import { useToDraft } from "./use-to-draft";

/**
 * A record cannot be edited, but its body can be rung up again: this copies it
 * into a fresh cart — on the screen its mode belongs to — and opens that cart.
 * The record stays where it is, so this is safe to repeat.
 */
export function ToDraftBtn({ record }: { record: RecordFull }) {
  const { error, loading, copy } = useToDraft(record.id, record.mode);
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" onClick={() => void copy()} disabled={loading} variant="outline">
        Jadikan Transaksi <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </div>
  );
}
