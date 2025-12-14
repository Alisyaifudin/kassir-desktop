import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { useAction } from "~/hooks/use-action";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { Size } from "~/lib/store-old";

export interface Method {
  id: number;
  name: string;
}

export const Item = memo(function ({ method, size }: { method: Method; size: Size }) {
  const loading = useLoading();
  const error = useAction<Action>()("edit");
  return (
    <>
      <div className="flex items-center gap-1 w-full">
        <Form method="POST" className="flex item-center gap-1 w-full">
          <input type="hidden" name="action" value="edit"></input>
          <input type="hidden" name="id" value={method.id}></input>
          <Input
            className="w-full"
            name="name"
            defaultValue={method.name}
            aria-autocomplete="list"
          />
          <Spinner when={loading} />
        </Form>
        <DeleteBtn method={method} size={size} />
      </div>
      <TextError>{error}</TextError>
    </>
  );
});
