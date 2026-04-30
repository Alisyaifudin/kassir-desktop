import { Link } from "react-router";
import { useGenerateUrlBack } from "~/hooks/use-generate-url-back";
import { Clock, GripVertical } from "lucide-react";
import { Show } from "~/components/Show";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Money } from "./use-money";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  return `${days} hari yang lalu`;
}

export function NavCard({ money }: { money: Money }) {
  const { id, name, timestamp, value } = money;
  const urlBack = useGenerateUrlBack("/money");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center gap-1">
        <div
          className="cursor-grab shrink-0 touch-none rounded p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
          {...listeners}
        >
          <GripVertical />
        </div>
        <Link
          to={{ pathname: `/money/${id}`, search: `url_back=${encodeURIComponent(urlBack)}` }}
          className="group flex flex-1 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
        >
          <div className="flex flex-col gap-1.5">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">{name}</h3>
            <Show value={timestamp} fallback={<div>Masih kosong</div>}>
              {(timestamp) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(timestamp)}</span>
                </div>
              )}
            </Show>
          </div>

          <Show value={value}>
            {(value) => (
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCurrency(value)}
                </span>
              </div>
            )}
          </Show>
        </Link>
      </div>
    </div>
  );
}
