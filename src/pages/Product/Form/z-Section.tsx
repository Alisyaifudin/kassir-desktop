import { createContext, useContext } from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * Whether the sections on screen are blocks of **one** card instead of a card
 * each.
 *
 * The detail pane draws the whole form as a single sheet: sections are separated
 * by a thick rule, and the rows inside a section by a muted one, so nothing is a
 * card inside a card inside a card. The create screen still wants a card per
 * section. Rather than a `flat` prop on five section components (`Section` plus
 * the four field groups) and again on every row and skeleton inside them, the
 * mode is one context value read where the markup actually is.
 */
const FlatSections = createContext(false);

/** Puts every `Section` and every field row below it into the flat, one-card mode. */
export function FlatSectionSurface({ children }: { children: React.ReactNode }) {
  return <FlatSections.Provider value={true}>{children}</FlatSections.Provider>;
}

/** True inside `FlatSectionSurface`: no nested card, no rounding, no fill. */
export function useFlatSection(): boolean {
  return useContext(FlatSections);
}

/**
 * The rows of one group inside a section: spaced apart on the card layout, and
 * separated by a **muted** rule — thinner and fainter than the thick one between
 * sections — when the pane is flat.
 */
export function rowsClass(flat: boolean): string {
  return flat ? "flex flex-col divide-y divide-border/60" : "flex flex-col gap-3";
}

/** One row of such a group: its padding alone, with no box of its own, when flat. */
export function rowClass(flat: boolean, base: string, flatBase: string): string {
  return flat ? flatBase : base;
}

export function Section({
  title,
  description,
  action,
  error,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const flat = useFlatSection();

  return (
    <section
      className={cn(
        flat
          ? "flex flex-col gap-3 px-4 py-4"
          : "flex flex-col gap-3 rounded-xl border bg-card p-4",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className={cn("font-semibold", flat ? "text-normal" : "text-small")}>{title}</h2>
          {description ? (
            <p className="text-small text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
      {error ? <p className="text-small text-destructive">{error}</p> : null}
    </section>
  );
}

/**
 * The `Tambah` (or `Tambah lot`) button every section carries in its header.
 *
 * It is static chrome — the section can always be added to — so the pending form
 * draws the same button, disabled, instead of holding a gap where it will be.
 * One component for both so the two states cannot drift apart in size or wording.
 */
export function SectionAdd({
  label = "Tambah",
  onClick,
  disabled,
}: {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 gap-1 text-small small:h-9"
      disabled={disabled}
      onClick={onClick}
    >
      <Plus className="icon" /> {label}
    </Button>
  );
}
