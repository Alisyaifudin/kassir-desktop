import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", className)}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-small font-semibold">{title}</h2>
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
