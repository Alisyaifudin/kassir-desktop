import { AlertCircle } from "lucide-react";

/**
 * One line of failure inside the region that failed, not a page-wide takeover:
 * the pockets are a different service, and losing them must not hide the day.
 * `Gate` renders this from a key's own error state — nothing is thrown, so no
 * boundary is needed to keep the rest of Beranda alive.
 */
export function RegionError({ title, error }: { title: string; error: { message: string } }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-card px-4 py-3"
    >
      <AlertCircle
        aria-hidden="true"
        className="mt-1 size-5 shrink-0 text-destructive small:size-4"
      />
      <div className="flex min-w-0 flex-col">
        <p className="font-medium text-destructive">{title}</p>
        <p className="text-small text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}
