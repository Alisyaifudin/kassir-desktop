import { Link } from "~/services/route/react";
import { ExternalLink, PackageOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useImageUrl } from "~/hooks/use-image";
import { cn } from "~/lib/utils";
import type { Combo } from "~/services/combo";
import { ComboStatus } from "./z-ComboBits";

export function ComboGrid({ items }: { items: Combo[] }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((combo) => <ComboCard key={combo.id} combo={combo} />)}
      </div>
    </div>
  );
}

function ComboCard({ combo }: { combo: Combo }) {
  const cover = combo.cover;
  const url = useImageUrl(cover?.name ?? null, cover?.mime ?? null);

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border bg-card", !combo.active && "bg-muted/40")}>
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted/40">
        {url !== null ? (
          <img src={url} alt={combo.name} draggable={false} className={cn("h-full w-full object-cover", !combo.active && "opacity-60 grayscale")} />
        ) : (
          <PackageOpen className="size-10 text-muted-foreground/40" aria-hidden="true" />
        )}
        <Button
          asChild
          size="icon"
          variant="secondary"
          className="absolute right-2 top-2 size-12 rounded-full bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background"
        >
          <Link to={`/combos/${combo.id}`} behavior="push" aria-label={`Ubah ${combo.name}`} title="Ubah combo">
            <ExternalLink className="size-5" />
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2 p-2.5">
        <div className="flex min-h-10 items-start justify-between gap-2">
          <span className={cn("line-clamp-2 min-w-0 text-sm font-medium leading-tight", !combo.active && "text-muted-foreground")}>
            {combo.name}
          </span>
          <ComboStatus active={combo.active} />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{combo.components.length} listing</span>
          <span>{combo.extras.length} tambahan</span>
        </div>
      </div>
    </div>
  );
}
