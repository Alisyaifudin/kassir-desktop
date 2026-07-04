import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";

type Props = {
  onClear: () => Promise<string | null>;
};

export function ClearLog({ onClear }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleClear() {
    if (loading) return;
    setLoading(true);
    const err = await onClear();
    setLoading(false);
    setError(err);
  }

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
