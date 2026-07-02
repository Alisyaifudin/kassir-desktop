import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useCallback, useState } from "react";

export function TestBtn({ print }: { print: () => Promise<string | null> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const error = await print();
    setLoading(false);
    setError(error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
