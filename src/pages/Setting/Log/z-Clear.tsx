import { Effect, pipe } from "effect";
import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { LOG_PATH } from "./loader";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { WriteError } from "./effect-error";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";

export function Clear() {
  const { loading, error, handleClear } = useClear();
  return (
    <div className="flex items-center gap-2">
      <TextError>{error}</TextError>
      <Button onClick={handleClear} variant="destructive">
        <Spinner when={loading} />
        Bersihkan
      </Button>
    </div>
  );
}

function useClear() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleClear() {
    setLoading(true);
    const error = await pipe(
      Effect.tryPromise({
        try: () => writeTextFile(LOG_PATH, "", { baseDir: BaseDirectory.AppLocalData }),
        catch: (e) => WriteError.new(e),
      }),
      Effect.map(() => null),
      Effect.catchTag("WriteError", (e) => Effect.succeed(e)),
      Effect.runPromise,
    );
    setLoading(false);
    if (error === null) {
      setError(null);
      revalidate("log");
      return;
    }
    log.error(JSON.stringify(error.e.cause));
    setError("Aplikasi bermasalah");
  }
  return { loading, error, handleClear };
}
