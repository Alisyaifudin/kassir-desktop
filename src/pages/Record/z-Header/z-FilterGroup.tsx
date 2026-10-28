import { Banknote, CreditCard, QrCode, Send } from "lucide-react";
import { METHOD_NAMES, type MethodKind } from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { Method } from "~/services/method";
import type { KindState, MethodGroup } from "../method-filter";

const ICONS: Record<MethodKind, typeof Banknote> = {
  cash: Banknote,
  transfer: Send,
  debit: CreditCard,
  qris: QrCode,
};

/**
 * A pill that is also a multi-select option, so it carries `role="checkbox"` +
 * `aria-checked` — the same semantics the checkboxes had, in badge clothing.
 *
 * The size arrives as `[font-size:var(--text-*)]` rather than `text-sm` /
 * `text-base` on purpose. `twMerge` reads this project's custom size tokens as
 * text *colours*, so passing one through `cn` alongside `text-primary-foreground`
 * silently deletes the colour — leaving dark text on a dark pill. The `--text-*`
 * custom properties sit in a different class group and are immune. Callers pass
 * it in `className`; leave it out of anything that goes through `cn` twice.
 */
function Badge({
  checked,
  icon,
  title,
  onClick,
  className,
  children,
}: {
  checked: boolean | "mixed";
  icon?: React.ReactNode;
  title?: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        checked === true
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : checked === "mixed"
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/60 hover:text-foreground",
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

/**
 * One kind's card: the kind as a pill, its variants below in a three-column grid.
 * The kind's pill is the group's whole state — solid when every payment of the
 * kind is in, tinted when only some of its variants are.
 */
export function FilterGroup({
  group,
  state,
  subChecked,
  onToggleKind,
  onToggleSub,
}: {
  group: MethodGroup;
  state: KindState;
  subChecked: (sub: Method) => boolean;
  onToggleKind: () => void;
  onToggleSub: (sub: Method) => void;
}) {
  const Icon = ICONS[group.base.kind];
  const active = state !== false;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300",
        active ? "border-primary/30 bg-accent/40 shadow-sm" : "border-border bg-card",
      )}
    >
      <Badge
        checked={state === "indeterminate" ? "mixed" : state}
        icon={<Icon className="size-5 shrink-0 [--icon-stroke:2.5]" />}
        onClick={onToggleKind}
        className="h-7 w-fit px-4 font-medium [font-size:var(--text-normal)]"
      >
        {METHOD_NAMES[group.base.kind]}
      </Badge>

      {group.subs.length > 0 ? (
        <div className="grid grid-cols-5 gap-2">
          {group.subs.map((sub) => (
            <Badge
              key={sub.id}
              checked={subChecked(sub)}
              title={sub.name ?? undefined}
              onClick={() => onToggleSub(sub)}
              className="h-7 w-full px-3 [font-size:var(--text-small)]"
            >
              {sub.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
