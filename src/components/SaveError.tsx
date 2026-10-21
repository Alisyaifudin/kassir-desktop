import { useEffect } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useStream } from "~/components/Loader";
import { service } from "~/services";

/**
 * The cart is written to SQLite on a debounce, so a failing write used to be
 * invisible: the screen said "saved", the disk disagreed, and a crash lost the
 * sale with no trace. This renders the message the transaction service keeps in
 * `get.saveError` (and toasts it once) until a later write succeeds.
 */
export function SaveError() {
  const res = useStream(service.transaction.get.saveError);
  const message = res.type === "success" ? res.data : null;

  useEffect(() => {
    if (message !== null) toast.error(message);
  }, [message]);

  if (message === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-50 flex max-w-md items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-small text-destructive shadow-lg"
    >
      <AlertTriangle className="size-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
