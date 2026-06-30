import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Effect } from "effect";
import { PrintError } from "~/services/print/error";
import { useCallback, useRef, useState } from "react";

export function TestBtn({ print }: { print: () => Effect.Effect<void, PrintError> }) {
  const printRef = useRef(print);
  printRef.current = print;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const error = await Effect.runPromise(
      printRef.current().pipe(
        Effect.as(null),
        Effect.catchAll((e) => Effect.succeed(e.e.message)),
      ),
    );
    setLoading(false);
    setError(error);
  }, [loading]);
  return (
    <div>
      <div className="flex flex-col gap-4">
        <Button onClick={handleClick} disabled={loading} className="mt-2">
          Tes Cetak <Spinner when={loading} />
        </Button>
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}
