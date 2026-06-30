import { Effect } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { LogService } from "~/services/log";
import { LogError } from "~/services/log/error";

export const clearLogEffect = Effect.gen(function* () {
  const logService = yield* LogService;
  const clear = () => logService.clear();
  return function ClearLog() {
    const { loading, error, handleClear } = useClearLog(clear);
    return (
      <div className="flex items-center gap-2">
        <TextError>{error}</TextError>
        <Button onClick={handleClear} variant="destructive">
          <Spinner when={loading} />
          Bersihkan
        </Button>
      </div>
    );
  };
});

function useClearLog(clear: () => Effect.Effect<void, LogError>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClear() {
    if (loading) return;
    setLoading(true);
    const error = await Effect.runPromise(
      clear().pipe(
        Effect.map(() => null),
        Effect.catchAll(() => Effect.succeed("Aplikasi bermasalah")),
      ),
    );
    setLoading(false);
    setError(error);
  }

  return { loading, error, handleClear };
}
