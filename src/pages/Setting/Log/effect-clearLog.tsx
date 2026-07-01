import { Effect } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { LogService } from "~/services/log";

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

function useClearLog(clear: () => Promise<string | null>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClear() {
    if (loading) return;
    setLoading(true);
    const error = await clear();
    setLoading(false);
    setError(error);
  }

  return { loading, error, handleClear };
}
