import { useEffect, useMemo, useRef, useState } from "react";
import { ProductImport } from "./util-validate-product";
import { Effect, Fiber } from "effect";
import { toast } from "sonner";
import { describeUpload, notifyUpload } from "~/lib/upload";
import { service } from "~/services";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Show } from "~/components/Show";
import { SkippedItems, type Skipped } from "../z-Skipped";

export function Selected({
  onRemove,
  data,
}: {
  data?: {
    products: ProductImport[];
    name: string;
  };
  onRemove: () => void;
}) {
  const length = useMemo(() => (data === undefined ? 0 : data.products.length), [data]);
  const fiberRef = useRef<Fiber.RuntimeFiber<void, unknown> | null>(null);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [progress, setProgress] = useState(0);
  // One upload per chosen file: `onRemove` is a fresh function on every parent
  // render, so without this the loop would restart whenever the page re-renders
  // (which is what happens when nothing was written and the file stays).
  const uploaded = useRef<typeof data>(undefined);

  function interruptUpload() {
    const fiber = fiberRef.current;

    fiberRef.current = null;

    if (fiber !== null) {
      Effect.runFork(Fiber.interrupt(fiber));
    }
  }

  function cancel() {
    interruptUpload();
    onRemove();
    toast.error("Unggahan dibatalkan");
  }

  useEffect(() => {
    const uploadEffect = Effect.gen(function* () {
      if (data === undefined || uploaded.current === data) return;
      uploaded.current = data;
      setProgress(0);
      setSkipped([]);
      // A row that cannot be written is skipped and reported, not allowed to stop
      // the rest of the file. The skips are collected locally so the final
      // message can count them without waiting for a state flush.
      const skippedRows: Skipped[] = [];
      for (const [index, product] of data.products.entries()) {
        yield* service.product.add(product).pipe(
          Effect.catchTags({
            ProductDuplicateCode: ({ value }) =>
              Effect.sync(() => {
                skippedRows.push({
                  key: `${index}`,
                  name: product.name,
                  reason: `kode ${value} sudah dipakai`,
                });
              }),
            ProductError: ({ message }) =>
              Effect.sync(() => {
                skippedRows.push({ key: `${index}`, name: product.name, reason: message });
              }),
          }),
        );
        setProgress(index + 1);
      }
      setSkipped(skippedRows);
      notifyUpload(
        describeUpload({
          written: data.products.length - skippedRows.length,
          skipped: skippedRows.length,
          noun: "produk",
        }),
      );
      // Nothing written means the file stays in the panel (with the skipped
      // reasons below it) so the operator can fix it and retry.
      if (skippedRows.length < data.products.length) onRemove();
    });

    const fiber = Effect.runFork(uploadEffect);
    fiberRef.current = fiber;

    return () => {
      interruptUpload();
    };
  }, [data, onRemove]);

  return (
    <div className="space-y-3">
      <Show value={data?.name}>
        {(name) => (
          <>
            <div className="flex items-center justify-between p-4 bg-card border border-input rounded-lg">
              <span className="font-medium text-foreground">{name}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Batalkan unggahan"
                title="Batalkan unggahan"
                onClick={cancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="icon" />
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border border-input bg-card p-4">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(length === 0 ? 0 : progress / length) * 100}%` }}
                />
              </div>
              <p className="text-small text-muted-foreground">
                {progress}/{length} data diproses
              </p>
            </div>
          </>
        )}
      </Show>
      <SkippedItems
        title="Produk dilewati"
        items={skipped}
        dismiss={() => setSkipped([])}
      />
    </div>
  );
}
