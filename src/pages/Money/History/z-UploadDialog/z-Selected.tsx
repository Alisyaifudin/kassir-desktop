import { useEffect, useMemo, useRef, useState } from "react";
import { MoneyImport } from "./util-validate-money";
import { Effect, Fiber } from "effect";
import { toast } from "sonner";
import { db } from "~/database";
import { log } from "~/lib/log";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Show } from "~/components/Show";
import { formatDate, formatTime } from "~/lib/date";
import { revalidate } from "../use-data";

export function Selected({
  onRemove,
  data,
  kindId,
}: {
  kindId: number;
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
  function addDuplicate(timestamp: number) {
    setTimestamps((n) => [...n, timestamp]);
  }

  useEffect(() => {
    const uploadEffect = Effect.gen(function* () {
      let i = 1;
      if (data === undefined) return;
      setProgress(0);
      setError(null);
      setTimestamps([]);
      for (const money of data.money) {
        yield* db.money.add.external(kindId, money).pipe(
          Effect.catchTag("DuplicateError", (e) => {
            addDuplicate(Number(e.name));
            return Effect.void;
          }),
        );
        setProgress(i);
        i++;
      }
      onRemove();
      setError(null);
      toast.success("Berhasil mengunggah");
      revalidate();
    }).pipe(
      Effect.catchTag("DbError", ({ e }) => {
        log.error(e);
        setError(e.message);
        onRemove();
        return Effect.void;
      }),
    );

    const fiber = Effect.runFork(uploadEffect);
    fiberRef.current = fiber;

    return () => {
      interruptUpload();
    };
  }, [data, kindId, onRemove]);

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
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
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
