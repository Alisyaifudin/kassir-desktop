import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useMode } from "../use-mode";

export function ModeTab() {
  const [mode, setMode] = useMode();
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50">
      <Button
        variant="ghost"
        className={cn(
          "px-3 h-10 text-normal font-bold rounded-md transition-all duration-200",
          mode === "sell"
            ? "bg-background text-primary shadow-sm hover:bg-background"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent",
        )}
        onClick={() => setMode("sell")}
      >
        Jual
      </Button>
      <Button
        variant="ghost"
        className={cn(
          "px-3 h-10 text-normal font-bold rounded-md transition-all duration-200",
          mode === "buy"
            ? "bg-background text-primary shadow-sm hover:bg-background"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent",
        )}
        onClick={() => setMode("buy")}
      >
        Beli
      </Button>
    </div>
  );
}
