import { Button } from "~/components/ui/button";
import { X } from "lucide-react";

export type Skipped = { key: string; name: string; reason: string };

/**
 * What an upload left out, and why. An upload keeps going past a row it cannot
 * write, so this is where the user sees what did not make it in.
 */
export function SkippedItems({
  title,
  items,
  dismiss,
}: {
  title: string;
  items: Skipped[];
  dismiss: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">{title}</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tutup"
          title="Tutup"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-5" />
        </Button>
      </div>
      <p className="mt-1 text-base text-amber-800">{items.length} data tidak disimpan.</p>
      <div className="mt-3 max-h-32 overflow-y-auto rounded-md bg-background/80 p-2">
        <ul className="space-y-1 text-base">
          {items.map((item) => (
            <li key={item.key} className="truncate">
              {item.name} <span className="text-amber-800">— {item.reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
