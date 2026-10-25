import { cn } from "~/lib/utils";

/**
 * The labelled cell the purchase rows are built from: a small uppercase label
 * above whatever control belongs to it.
 *
 * One component rather than the label markup copied into every row, which is
 * how the sale screen accumulated the same eight-line div ten times over.
 */
export function Field({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <span className="mb-1.5 ml-0.5 truncate text-small font-bold uppercase tracking-wide text-muted-foreground/70 select-none">
        {label}
      </span>
      {children}
    </div>
  );
}
