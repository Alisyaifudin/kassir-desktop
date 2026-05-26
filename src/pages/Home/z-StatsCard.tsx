import { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  className?: string;
}

export function StatsCard({
  label,
  value,
  description,
  icon: Icon,
  color = "text-primary",
  className,
}: StatsCardProps) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground">{label}</span>
        <Icon size={20} className={color} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-bold tracking-tight">{value}</span>
        <span className="text-small text-muted-foreground">{description}</span>
      </div>
    </div>
  );
}
