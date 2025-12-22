import { Input } from "~/components/ui/input";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { memo } from "react";
import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { DeleteBtn } from "./DeleteBtn";
import { Form } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";

export const Item = memo(function ({
  id,
  name,
  value,
}: {
  id: number;
  name: string;
  value: string;
}) {
  const loading = useLoading(); // TODO: better fine-grained loading
  const error = useAction<Action>()("edit");
  const size = useSize();
  return (
    <Form method="POST" className={cn("grid gap-2 px-0.5 items-center", css.item[size])}>
      <input type="hidden" name="id" value={id}></input>
      <input type="hidden" name="action" value="edit"></input>
      <Input name="name" defaultValue={name} placeholder="Nama Kontak" aria-autocomplete="list" />
      <Input
        name="value"
        defaultValue={value}
        placeholder="Isian Kontak"
        aria-autocomplete="list"
      />
      <button type="submit" className="hidden">
        Submit
      </button>
      <Show when={!loading} fallback={<Loader2 className="animate-spin" />}>
        <DeleteBtn id={id} name={name} value={value} />
      </Show>
      <TextError className="col-span-2">{error?.global}</TextError>
      <TextError>{error?.name}</TextError>
      <TextError>{error?.value}</TextError>
    </Form>
  );
});
