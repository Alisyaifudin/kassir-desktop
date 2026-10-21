import { useEffect, useMemo, useRef, useState } from "react";
import { Effect, Fiber } from "effect";
import { toast } from "sonner";
import { describeUpload, notifyUpload } from "~/lib/upload";
import { service } from "~/services";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Show } from "~/components/Show";
import { formatDate, formatTime } from "~/lib/date";
import { SkippedItems, type Skipped } from "../z-Skipped";
import { RecordImport } from "./util-validate-record";

export function Selected({
  onRemove,
  data,
}: {
  data?: {
    records: RecordImport[];
    name: string;
  };
  onRemove: () => void;
}) {
  const length = useMemo(() => (data === undefined ? 0 : data.records.length), [data]);
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
      // A record whose stock cannot cover it is skipped and reported; the rest of
      // the file still goes in, one transaction per record. The skips are
      // collected locally so the final message can count them.
      const skippedRows: Skipped[] = [];
      for (const [index, record] of data.records.entries()) {
        yield* service.record.add.external(record).pipe(
          Effect.catchTag("RecordError", ({ message }) =>
            Effect.sync(() => {
              skippedRows.push({
                key: `${index}`,
                name: `${formatDate(record.paidAt, "long")}, ${formatTime(record.paidAt, "long")}`,
                reason: message,
              });
            }),
          ),
        );
        setProgress(index + 1);
      }
      setSkipped(skippedRows);
      notifyUpload(
        describeUpload({
          written: data.records.length - skippedRows.length,
          skipped: skippedRows.length,
          noun: "catatan",
        }),
      );
      // Nothing written keeps the file in the panel, next to the reasons.
      if (skippedRows.length < data.records.length) onRemove();
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
        title="Catatan dilewati"
        items={skipped}
        dismiss={() => setSkipped([])}
      />
    </div>
  );
}
