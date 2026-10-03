import { cn } from "~/lib/utils";
import { Extra } from "~/database/extra/cache";

/**
 * A single row in the extra search dropdown.
 *
 * Rendered as a <button> so the whole row is clickable and focusable.
 * `onMouseDown` is prevented so the search input keeps focus — the dropdown
 * stays open and arrow-key navigation keeps working after a click.
 */
export function ExtraCard({
  extra,
  index,
  active = false,
  onSelect,
}: {
  extra: Extra;
  index: number;
  active?: boolean;
  onSelect: (extra: Extra) => void;
}) {
  const isPercent = extra.kind === "percent";
  const value = isPercent
    ? `${extra.value.toLocaleString("id-ID")}%`
    : `Rp${extra.value.toLocaleString("id-ID")}`;

  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        onClick={() => onSelect(extra)}
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
          active
            ? "bg-active text-active-foreground shadow-md"
            : "hover:bg-accent focus-visible:bg-accent",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-tiny font-semibold tabular-nums transition-colors",
            active
              ? "bg-active-foreground/20 text-active-foreground"
              : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground",
          )}
        >
          {index + 1}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span
            title={extra.name}
            className={cn(
              "truncate text-small leading-tight",
              active ? "font-semibold text-active-foreground" : "font-medium text-foreground",
            )}
          >
            {extra.name}
          </span>
          <span
            className={cn(
              "text-tiny leading-tight",
              active ? "text-active-foreground/75" : "text-muted-foreground",
            )}
          >
            {isPercent ? "Persen" : "Angka"}
          </span>
        </span>

        <span
          className={cn(
            "shrink-0 text-small font-bold tabular-nums",
            active ? "text-active-foreground" : "text-foreground",
          )}
        >
          {value}
        </span>
      </button>
    </li>
  );
}
