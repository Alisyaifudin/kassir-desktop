import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { DeleteBtn } from "./DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import { Form, useSubmit } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Cashier } from "~/database/cashier/get-all";

export const Item = memo(function ({ cashier, username }: { cashier: Cashier; username: string }) {
  const loading = useLoading();
  const error = useAction<Action>()("update-name");
  if (username === cashier.name) {
    return (
      <div className="flex items-center justify-between pr-16">
        <p className="pl-3">{username}</p>
        <p>{title[cashier.role]}</p>
      </div>
    );
  }
  return (
    <Form method="POST" className="flex items-center px-0.5 gap-3">
      <input type="hidden" name="action" value="update-name"></input>
      <input type="hidden" name="old-name" value={cashier.name}></input>
      <Input type="text" defaultValue={cashier.name} name="new-name" aria-autocomplete="list" />
      <Spinner when={loading} />
      <TextError>{error}</TextError>
      <SelectRole cashier={cashier} />
      <DeleteBtn name={cashier.name} />
    </Form>
  );
});

const title = {
  admin: "Admin",
  user: "User",
};

function SelectRole({ cashier }: { cashier: Cashier }) {
  const submit = useSubmit();
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.currentTarget.value;
    if (role !== "admin" && role !== "user") {
      return;
    }
    const formdata = new FormData();
    formdata.set("action", "update-role");
    formdata.set("name", cashier.name);
    formdata.set("role", role);
    submit(formdata, { method: "POST" });
  };
  return (
    <select onChange={handleChange} className="text-normal" value={cashier.role}>
      <option value="admin">Admin</option>
      <option value="user">User</option>
    </select>
  );
}
