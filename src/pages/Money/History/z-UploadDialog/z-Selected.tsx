import { useEffect, useMemo, useRef, useState } from "react";
import { MoneyImport } from "./util-validate-money";
import { Effect, Fiber } from "effect";
import { toast } from "sonner";
import { describeUpload, notifyUpload } from "~/lib/upload";
import { service } from "~/services";
import { log } from "~/lib/log";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Show } from "~/components/Show";
import { formatDate, formatTime } from "~/lib/date";

export function Selected({
  onRemove,
  data,
  pocketId,
}: {
  pocketId: string;
  data?: {
    money: MoneyImport[];
    name: string;
  };
  onRemove: () => void;
}) {
  const length = useMemo(() => (data === undefined ? 0 : data.money.length), [data]);
  const fiberRef = useRef<Fiber.RuntimeFiber<void, unknown> | null>(null);
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  // One upload per chosen file: `onRemove` is a fresh function on every parent
  // render, so without this the loop would restart whenever the page re-renders
  // (which is what happens when nothing was written and the file stays).
  const uploaded = useRef<typeof data>(undefined);
  const [error, setError] = useState<null | string>(null);

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
      let i = 1;
      if (data === undefined) return;
      setProgress(0);
      setError(null);
      setTimestamps([]);
      // A duplicate timestamp is skipped, not fatal; the count decides what the
      // final message says.
      const duplicates: number[] = [];
      for (const money of data.money) {
        yield* service.money.entries.add.imported({
          pocketId,
          timestamp: money.timestamp,
          value: money.value,
          note: money.note,
        }).pipe(
          Effect.catchTag("DuplicateError", (e) => {
            duplicates.push(Number(e.name));
            return Effect.void;
          }),
        );
        setProgress(i);
        i++;
      }
      setTimestamps(duplicates);
      notifyUpload(
        describeUpload({
          written: data.money.length - duplicates.length,
          skipped: duplicates.length,
          noun: "catatan",
        }),
      );
      // Nothing written keeps the file in the panel, next to the reasons.
      if (duplicates.length < data.money.length) onRemove();
    }).pipe(
      Effect.catchTag("MoneyError", ({ message }) => {
        log.error(message);
        setError(message);
        onRemove();
        return Effect.void;
      }),
    );

    const fiber = Effect.runFork(uploadEffect);
    fiberRef.current = fiber;

    return () => {
      interruptUpload();
    };
  }, [data, pocketId, onRemove]);

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
                {progress}/{length} data tersimpan
              </p>
            </div>
          </>
        )}
      </Show>
      <TextError>{error}</TextError>
      <DuplicateItem timestamps={timestamps} dismiss={() => setTimestamps([])} />
    </div>
  );
}

function DuplicateItem({ timestamps, dismiss }: { timestamps: number[]; dismiss: () => void }) {
  if (timestamps.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
      <div className="flex items-center justify-between">
        <p className="text-small font-semibold">Catatan keuangan duplikat dilewati</p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tutup"
          title="Tutup"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="icon" />
        </Button>
      </div>
      <p className="mt-1 text-small text-amber-800">
        {timestamps.length} catatan yang memiliki waktu yang sama
      </p>
      <div className="mt-3 max-h-32 overflow-y-auto rounded-md bg-background/80 p-2">
        <ul className="space-y-1 text-small">
          {timestamps.map((timestamp) => (
            <li key={timestamp} className="truncate">
              {formatDate(timestamp, "long")}, {formatTime(timestamp, "long")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
