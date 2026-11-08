import { PackageOpen } from "lucide-react";
import { Button } from "~/components/ui/button";

export function Empty({ total, onReset }: { total: number; onReset: () => void }) {
  const filtered = total > 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <PackageOpen className="size-12" aria-hidden="true" />
      <p className="text-sm">
        {filtered ? `Tidak ada dari ${total} combo yang cocok.` : "Belum ada kombo."}
      </p>
      {filtered ? (
        <Button type="button" variant="outline" className="h-11 text-sm" onClick={onReset}>
          Reset filter
        </Button>
      ) : null}
    </div>
  );
}
