import { PackageOpen } from "lucide-react";
import { Button } from "~/components/ui/button";

export function Empty({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <PackageOpen className="size-12" />
      <p className="text-normal">Tidak ada produk yang cocok.</p>
      <Button type="button" variant="outline" onClick={onReset}>
        Reset filter
      </Button>
    </div>
  );
}
