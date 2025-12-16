import { Form } from "react-router";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useAction } from "~/hooks/use-action";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { auth } from "~/lib/auth";

export function Name() {
  const loading = useLoading();
  const error = useAction<Action>()("change-name");
  const name = auth.user().name;
  return (
    <Form method="POST" className="flex-col gap-2 flex">
      <input type="hidden" name="action" value="change-name"></input>
      <label className="grid grid-cols-[150px_1fr] gap-2 text-normal items-center">
        <span>Nama</span>
        <Input defaultValue={name} name="name" required aria-autocomplete="list" />
      </label>
      <Button className="w-fit self-end">
        Simpan <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </Form>
  );
}
