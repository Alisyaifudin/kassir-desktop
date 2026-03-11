import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Data } from "../use-records";
import { useToTransaction } from "./use-to-transaction";
import { Spinner } from "~/components/Spinner";

export function ToTransaction({ data }: { data: Data }) {
  const { error, loading, handleClick } = useToTransaction(data);
  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} variant="secondary">
        Jadikan Transaksi
        <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </div>
  );
}
