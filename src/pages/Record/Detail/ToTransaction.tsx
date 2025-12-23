import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { TextError } from "~/components/TextError";

export function ToTransaction({ timestamp }: { timestamp: number }) {
  const error = useAction<Action>()("to-transaction");
  return (
    <Form method="POST" className="flex flex-col gap-1">
      <input type="hidden" name="action" value="to-transaction"></input>
      <input type="hidden" name="timestamp" value={timestamp}></input>
      <Button variant="secondary">Jadikan Transaksi</Button>
      <TextError>{error}</TextError>
    </Form>
  );
}
