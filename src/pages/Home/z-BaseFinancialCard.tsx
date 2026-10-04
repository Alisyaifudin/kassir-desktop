import { LucideIcon } from "lucide-react";
import { StatsCard } from "./z-StatsCard";

interface BaseFinancialCardProps {
  label: string;
  icon: LucideIcon;
  color: string;
  /** Today's grand total. */
  value: number;
  /** Yesterday's grand total, for the day-over-day delta. */
  previous: number;
}

export function BaseFinancialCard({
  label,
  icon,
  color,
  value,
  previous,
}: BaseFinancialCardProps) {
  const diff = value - previous;
  const percent = previous === 0 ? null : Math.abs((diff / previous) * 100).toFixed(1);
  const sign = diff >= 0 ? "+" : "-";

  return (
    <StatsCard
      label={label}
      value={`Rp ${value.toLocaleString("id-ID")}`}
      description={percent === null ? "" : `${sign}${percent}% dari kemarin`}
      icon={icon}
      color={color}
    />
  );
}
