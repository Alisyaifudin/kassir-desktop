import { Button } from "~/components/ui/button";
import { useTestPrint } from "./use-test";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";

export function TestBtn() {
  const { error, success, handleClick, loading } = useTestPrint();
  return (
    <div>
      <div className="flex flex-col gap-4">
        <Button onClick={handleClick} disabled={loading}>
          Tes Cetak <Spinner when={loading} />
        </Button>
      </div>
      <TextError>{error}</TextError>
      {/* `role="status"`: the one thing a cashier needs after a test print, and
          it must be announced, not just drawn. It says "sent", never "printed". */}
      {success === null ? null : (
        <p role="status" className="text-base text-muted-foreground">
          {success}
        </p>
      )}
    </div>
  );
}
