import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useParams, useSetParams } from "../use-params";

export function ModeTab() {
  const mode = useParams().mode;
  const setMode = useSetParams().mode;
  return (
    <div className="flex items-center gap-1 px-1 rounded-lg bg-muted">
      <Button
        variant="ghost"
        className={cn({ "bg-background shadow hover:bg-background/70": mode === "sell" })}
        onClick={() => setMode("sell")}
      >
        Jual
      </Button>
      <Button
        variant="ghost"
        className={cn({ "bg-background shadow hover:bg-background/70": mode === "buy" })}
        onClick={() => setMode("buy")}
      >
        Beli
      </Button>
    </div>
  );
}
