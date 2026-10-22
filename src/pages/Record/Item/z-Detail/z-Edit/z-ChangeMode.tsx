import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import type { RecordFull } from "~/services/record";
import { useChangeMode } from "./use-change-mode";

const title = { outcoming: "Beli", incoming: "Jual" } as const;
const body = { outcoming: "pembelian", incoming: "penjualan" } as const;

/**
 * The other half of the edit: what was rung up as a sale becomes a purchase, or
 * the reverse. It is destructive on purpose — the record is replaced rather than
 * rewritten — and it takes the page with it to the replacement.
 */
export function ChangeMode({ record }: { record: RecordFull }) {
  const { error, loading, change } = useChangeMode(record.id);
  const next = record.mode === "incoming" ? "outcoming" : "incoming";

  return (
    <div className="flex flex-col gap-1">
      <p>Mode saat ini: {title[record.mode]}</p>
      <Button
        type="button"
        onClick={() => void change(next)}
        variant="destructive"
        className="w-fit"
        disabled={loading}
      >
        Ubah jadi {title[next]} <Spinner when={loading} />
      </Button>
      <p className="text-small text-muted-foreground">
        Catatan ini dibuat ulang sebagai {body[next]} lalu yang lama dihapus.
      </p>
      <TextError>{error}</TextError>
    </div>
  );
}
