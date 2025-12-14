import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { DeleteBtn } from "./DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Size } from "~/lib/store-old";

export const Item = memo(function ({ customer, size }: { customer: DB.Customer; size: Size }) {
  const loading = useLoading();
  const error = useAction<Action>()("edit");
  return (
    <Form method="POST" className="flex items-center gap-3">
      <input type="hidden" name="action" value="edit"></input>
      <Input type="text" defaultValue={customer.name} name="name" aria-autocomplete="list" />
      <p>{customer.phone}</p>
      <Spinner when={loading} />
      <TextError>{error}</TextError>
      <DeleteBtn name={customer.name} phone={customer.phone} size={size} />
    </Form>
  );
});
