import { useEffect, useMemo, useRef, useState } from "react";
import { Effect, Fiber } from "effect";
import { toast } from "sonner";
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
      if (data === undefined) return;
      setProgress(0);
      setSkipped([]);
      // A record whose stock cannot cover it is skipped and reported; the rest of
      // the file still goes in, one transaction per record.
      for (const [index, record] of data.records.entries()) {
        yield* service.record.add.external(record).pipe(
          Effect.catchTag("RecordError", ({ message }) =>
            Effect.sync(() =>
              setSkipped((items) => [
                ...items,
                {
                  key: `${index}`,
                  name: `${formatDate(record.paidAt, "long")}, ${formatTime(record.paidAt, "long")}`,
                  reason: message,
                },
              ]),
            ),
          ),
        );
        setProgress(index + 1);
      }
      onRemove();
      toast.success("Berhasil mengunggah");
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
                onClick={cancel}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
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
