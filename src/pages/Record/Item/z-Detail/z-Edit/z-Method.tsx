import { Loader, useStream } from "~/components/Loader";
import { MethodPicker } from "~/components/MethodPicker";
import { Skeleton } from "~/components/ui/skeleton";
import { service } from "~/services";

/**
 * Which method the record was rung up on. It is editable because the mistake
 * this fixes is a mis-tap at the counter — Tunai pressed for a QRIS sale with
 * the right money taken — and rewriting the record to change one label is not
 * worth it.
 *
 * The catalog is read here rather than drilled down from the page: the picker is
 * the only reader on this screen, and it lives inside the dialog, so the
 * subscription only exists while the dialog is open.
 */
export function MethodField({
  methodId,
  onChange,
  disabled,
}: {
  methodId: string;
  onChange: (methodId: string) => void;
  disabled: boolean;
}) {
  const res = useStream(service.method.get.catalogChanges);

  return (
    <div className="flex flex-col gap-1">
      <span>Metode</span>
      <Loader res={res} fallback={<Skeleton className="h-10 w-full small:h-7" />}>
        {({ data: catalog }) => (
          <fieldset disabled={disabled} className="min-w-0">
            <MethodPicker methodId={methodId} catalog={catalog} onChange={onChange} />
          </fieldset>
        )}
      </Loader>
      <span className="text-small text-muted-foreground">
        Hanya metode yang berubah; jumlah yang dibayar tetap.
      </span>
    </div>
  );
}
