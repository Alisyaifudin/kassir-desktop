import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { memo, useEffect } from "react";
import { useAction } from "~/hooks/use-action";
import { Form, useSubmit } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { Action } from "./action";
import { Method } from "~/database/method/get-all";
import { toast } from "sonner";

export const Item = memo(function ({ method, defVal }: { method: Method; defVal?: number }) {
  const loading = useLoading();
  const error = useAction<Action>()("edit");
  return (
    <>
      <div className="flex items-center gap-1 w-full">
        <Form method="POST" className="flex item-center gap-1 w-full">
          <input type="hidden" name="action" value="edit"></input>
          <input type="hidden" name="id" value={method.id}></input>
          <DefaultMethod kind={method.kind} id={method.id} defVal={defVal} />
          <Input
            className="w-full"
            name="name"
            defaultValue={method.name}
            aria-autocomplete="list"
          />
          <Spinner when={loading} />
        </Form>
        <DeleteBtn method={method} />
      </div>
      <TextError>{error}</TextError>
    </>
  );
});

function DefaultMethod({ kind, id, defVal }: { kind: DB.MethodEnum; id: number; defVal?: number }) {
  const submit = useSubmit();
  const loading = useLoading();
  const error = useAction<Action>()("update-default");
  useEffect(() => {
    if (!loading && error !== undefined) {
      toast.error(error);
    }
  }, [loading, error]);
  function handleClick() {
    if (kind === "cash") return;
    const formdata = new FormData();
    formdata.set("action", "update-default");
    formdata.set("kind", kind);
    if (defVal !== id) {
      formdata.set("id", id.toString());
    }
    submit(formdata, { method: "POST" });
  }
  return (
    <input
      type="radio"
      name={kind}
      onClick={handleClick}
      onChange={() => {}}
      checked={id === defVal}
    />
  );
}
