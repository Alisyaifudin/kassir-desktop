import { useState } from "react";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { SonnerService } from "~/services/sonner";

type Props = {
  pocketId: string;
  usePocket: () => { name: string };
  sonner: typeof SonnerService.Type;
  onDownload: (pocketId: string, name: string) => Promise<string | null>;
};

export function Download({ pocketId, usePocket, onDownload }: Props) {
  const pocket = usePocket();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const errMsg = await onDownload(pocketId, pocket.name);
    setLoading(false);
    if (errMsg !== null) {
      sonner.error(errMsg);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      <Spinner when={loading} />
      Unduh
    </Button>
  );
}
