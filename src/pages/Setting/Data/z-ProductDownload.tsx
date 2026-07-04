import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useState } from "react";

type Props = {
  onDownload: () => Promise<string | null>;
};

export function ProductDownload({ onDownload }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const errMsg = await onDownload();
    setLoading(false);
    setError(errMsg);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center justify-between p-2">
      <input type="hidden" name="action" value="product" />
      <h3 className="italic text-normal font-bold">Produk</h3>
      <Button>
        Unduh
        <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </form>
  );
}
