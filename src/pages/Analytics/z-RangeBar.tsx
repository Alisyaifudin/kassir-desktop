import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useRange, INTERVALS, PRESETS } from "./use-range";
import { longDate } from "./util-bucket";

/** The period and the bucket width, shared by every analysis page. */
export function RangeBar() {
  const { from, to, interval, preset, setPreset, setInterval } = useRange();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Periode">
        {PRESETS.map((option) => (
          <Button
            key={option.key}
            type="button"
            size="sm"
            variant={preset === option.key ? "default" : "ghost"}
            aria-pressed={preset === option.key}
            onClick={() => setPreset(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-small text-muted-foreground tabular-nums">
          {longDate(from)} – {longDate(to - 1)}
        </span>
        <div
          role="group"
          aria-label="Lebar titik"
          className="flex items-center gap-0.5 rounded-md border bg-muted p-0.5"
        >
          {INTERVALS.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={interval === option.key ? "default" : "ghost"}
              aria-pressed={interval === option.key}
              className={cn(
                "rounded-sm",
                interval === option.key ? undefined : "hover:bg-background",
              )}
              onClick={() => setInterval(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
