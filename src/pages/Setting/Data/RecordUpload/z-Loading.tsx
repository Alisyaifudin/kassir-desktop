import { FileJson2, Loader2 } from "lucide-react";

export function Loading() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-1 py-2 text-center shadow-sm">
      <div className="relative grid place-items-center rounded-full border border-border bg-background/80 p-2 text-muted-foreground shadow-xs">
        <FileJson2 className="icon opacity-40" />
        <Loader2 className="icon absolute animate-spin text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Memproses data produk</p>
        <p className="text-small text-muted-foreground">Validasi dan membaca berkas JSON.</p>
      </div>
    </div>
  );
}
