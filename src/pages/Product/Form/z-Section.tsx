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
          <h2 className="font-semibold">{title}</h2>
          {description ? (
            <p className="text-normal text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
