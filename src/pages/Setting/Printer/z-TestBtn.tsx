import { Button } from "~/components/ui/button";
import { useTestPrint } from "./use-test";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";

export function TestBtn() {
  const { error, handleClick, loading } = useTestPrint();
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
