import { cn } from "~/lib/utils";

export function ComboStatus({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        !active && "text-muted-foreground",
      )}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

export function comboUpdatedAt(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(timestamp);
}
