import { cn } from "~/lib/utils";

/** One number with its name and a quiet qualifier — the dashboard's unit. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-base font-semibold tabular-nums", tone)}>{value}</span>
      {hint === undefined ? null : <span className="text-sm text-muted-foreground">{hint}</span>}
    </div>
  );
}
