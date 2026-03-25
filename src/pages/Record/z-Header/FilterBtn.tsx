import { Banknote, CreditCard, QrCode, Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Method } from "~/database/method/cache";
import { METHOD_NAMES } from "~/lib/constants";
import { cn } from "~/lib/utils";

const ICONS = {
  cash: Banknote,
  transfer: Send,
  debit: CreditCard,
  qris: QrCode,
};

export function FilterBtn({
  selected,
  onClick,
  options,
  top,
}: {
  onClick: (id: string) => void;
  selected: string | null;
  top: Method;
  options: Method[];
}) {
  const Icon = ICONS[top.kind];
  const isSelected = top.id === selected;
  const isAnyOptionSelected = options.some((o) => o.id === selected);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-2xl border transition-all duration-300",
        isSelected || isAnyOptionSelected
          ? "bg-accent/40 border-primary/30 shadow-sm"
          : "bg-card border-border hover:border-muted-foreground/20",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2.5 rounded-xl transition-colors duration-200",
              isSelected
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            <Icon size={22} strokeWidth={2.5} />
          </div>
          <Button
            variant={isSelected ? "default" : "outline"}
            onClick={() => onClick(top.id)}
            className={cn(
              "rounded-full h-10 px-3 text-normal font-medium transition-all duration-200",
              isSelected
                ? "shadow-md scale-105 text-primary-foreground border-transparent"
                : "hover:bg-accent/60 hover:border-accent",
            )}
          >
            {METHOD_NAMES[top.kind]}
          </Button>
        </div>
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-2">
          {options.map((m) => {
            const isOptionSelected = m.id === selected;
            return (
              <Button
                key={m.id}
                variant={isOptionSelected ? "default" : "outline"}
                className={cn(
                  "rounded-full h-10 px-3 text-normal font-medium transition-all duration-200",
                  isOptionSelected
                    ? "shadow-md scale-105 text-primary-foreground border-transparent"
                    : "hover:bg-accent/60 hover:border-accent",
                )}
                onClick={() => onClick(m.id)}
              >
                {m.name}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
