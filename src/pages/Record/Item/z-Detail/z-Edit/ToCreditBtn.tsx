import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { memo } from "react";
import { useToCredit } from "./use-to-credit";

export const ToCreditBtn = memo(function ToCreditBtn({
  close,
  recordId,
}: {
  recordId: string;
  close: () => void;
}) {
  const { error, handleClick, loading } = useToCredit(recordId, close);
  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} variant="destructive" className="w-fit">
        Ubah jadi kredit
        <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </div>
  );
});
