import { type LucideIcon } from "lucide-react";
import { Effect } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useCallEffect } from "~/hooks/use-call-effect";
import { sync } from "~/lib/sync";

export function ProductSync({ token, icon: Icon }: { token: string; icon: LucideIcon }) {
  const { error, handleClick, loading, count } = useSync(token);
  return (
    <li className="flex flex-col gap-1.5 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-normal font-medium flex-1">Produk</span>
        <Button disabled={loading} onClick={handleClick} variant="outline">
          <Spinner when={loading} />
          Sinkronisasi
        </Button>
      </div>
      {(count.total > 0 || count.server > 0 || count.unsync > 0 || error) && (
        <div className="flex flex-col gap-0.5 pl-6">
          <div className="flex items-center gap-2 text-muted-foreground text-small">
            {count.total > 0 ? (
              <span>Mengunduh {count.server} dari {count.total}...</span>
            ) : count.server > 0 ? (
              <span>Unduh Data: {count.server}</span>
            ) : null}
            {count.unsync > 0 ? <span>Mengunggah {count.unsync}...</span> : null}
          </div>
          <TextError>{error}</TextError>
        </div>
      )}
    </li>
  );
}

function useSync(token: string) {
  const [count, setCount] = useState({ server: 0, unsync: 0, total: 0 });
  const { error, handler, loading } = useCallEffect(() => programSyncProduct(token, setCount));
  return { error, handleClick: handler, loading, count };
}

const LIMIT = 1000;

function programSyncProduct(
  token: string,
  setCount: React.Dispatch<React.SetStateAction<{ server: number; unsync: number; total: number }>>,
) {
  return Effect.gen(function* () {
    const stop = { pull: false, push: false };
    for (let i = 0; i < LIMIT; i++) {
      const count = yield* sync.product(token, stop);
      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;
      setCount(count);
      if (count.server === 0 && count.unsync === 0) break;
    }

    stop.pull = false;
    stop.push = false;
    for (let i = 0; i < LIMIT; i++) {
      const count = yield* sync.productEvent(token, stop);
      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;
      setCount(count);
      if (count.server === 0 && count.unsync === 0) break;
    }
  });
}
