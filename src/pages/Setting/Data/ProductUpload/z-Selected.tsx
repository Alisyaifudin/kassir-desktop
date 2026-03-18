import { useEffect, useMemo, useRef, useState } from "react";
import { ProductImport } from "./util-validate-product";
import { Effect, Fiber } from "effect";
import { toast } from "sonner";
import { db } from "~/database";
import { log } from "~/lib/log";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import { Show } from "~/components/Show";

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
  const [names, setNames] = useState<string[]>([]);
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
  function addDuplicate(name: string) {
    setNames((n) => [...n, name]);
  }

  useEffect(() => {
    const uploadEffect = Effect.gen(function* () {
      let i = 1;
      if (data === undefined) return;
      setProgress(0);
      setError(null);
      setNames([]);
      for (const product of data.products) {
        yield* db.product.add(product).pipe(
          Effect.catchTag("DuplicateError", (e) => {
            addDuplicate(e.name);
            return Effect.void;
          }),
        );
        setProgress(i);
        i++;
      }
      onRemove();
      setError(null);
      toast.success("Berhasil mengunggah");
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
                {progress}/{length} data tersimpan
              </p>
            </div>
          </>
        )}
      </Show>
      <TextError>{error}</TextError>
      <DuplicateItem names={names} dismiss={() => setNames([])} />
    </div>
  );
}

function DuplicateItem({ names, dismiss }: { names: string[]; dismiss: () => void }) {
  if (names.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
      <div className="flex items-center justify-between">
        <p className="text-small font-semibold">Produk duplikat dilewati</p>
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
        {names.length} barang tidak disimpan karena memiliki kode yang sama.
      </p>
      <div className="mt-3 max-h-32 overflow-y-auto rounded-md bg-background/80 p-2">
        <ul className="space-y-1 text-small">
          {names.map((name, index) => (
            <li key={`${name}-${index}`} className="truncate">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
