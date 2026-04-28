import { Effect } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useCallEffect } from "~/hooks/use-call-effect";
import { sync } from "~/lib/sync";

export function RecordSync({ token }: { token: string }) {
  const { error, handleClick, loading, count } = useSync(token);
  return (
    <li className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span>Transaksi</span>
        <Button disabled={loading} onClick={handleClick}>
          <Spinner when={loading} />
          Sinkronisasi
        </Button>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground text-small">
        {count.total > 0 ? (
          <span>Mengunduh {count.server} dari {count.total}...</span>
        ) : count.server > 0 ? (
          <span>Unduh Data: {count.server}</span>
        ) : null}
        {count.unsync > 0 ? <span>Mengunggah {count.unsync}...</span> : null}
      </div>
      <TextError>{error}</TextError>
    </li>
  );
}

function useSync(token: string) {
  const [count, setCount] = useState({
    server: 0,
    unsync: 0,
    total: 0,
  });
  const { error, handler, loading } = useCallEffect(() => programSyncRecord(token, setCount));
  return { error, handleClick: handler, loading, count };
}

const LIMIT = 1000;

function programSyncRecord(
  token: string,
  setCount: React.Dispatch<
    React.SetStateAction<{
      server: number;
      unsync: number;
      total: number;
    }>
  >,
) {
  return Effect.gen(function* () {
    // sync methods first
    const stop = {
      pull: false,
      push: false,
    };
    for (let i = 0; i < LIMIT; i++) {
      const count = yield* sync.method(token, stop);
      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;
      setCount(count);
      if (count.server === 0 && count.unsync === 0) {
        break;
      }
    }

    // sync records
    stop.pull = false;
    stop.push = false;
    for (let i = 0; i < LIMIT; i++) {
      const count = yield* sync.record(token, stop);
      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;
      setCount(count);
      if (count.server === 0 && count.unsync === 0) {
        break;
      }
    }
  });
}
