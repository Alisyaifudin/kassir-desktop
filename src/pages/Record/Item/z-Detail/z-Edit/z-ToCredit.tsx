import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { useToCredit } from "./use-to-credit";

export function ToCredit({ id, onSuccess }: { id: string; onSuccess: () => void }) {
  const { error, loading, makeCredit } = useToCredit(id, onSuccess);
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" onClick={makeCredit} variant="destructive" className="w-fit" disabled={loading}>
        Ubah jadi kredit <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </div>
  );
}
