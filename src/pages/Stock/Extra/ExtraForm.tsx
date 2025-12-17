import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { DeleteBtn } from "./DeleteBtn";
import { Field } from "../Field";
import { Label } from "~/components/ui/label";
import { Form } from "react-router";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "./action";
import { Extra } from "~/database/extra/caches";

export function AdditionalForm({ extra: extra }: { extra: Extra }) {
  const loading = useLoading();
  const error = useAction<Action>()("edit");
  return (
    <Form method="POST" className="flex flex-col gap-2 w-full">
      <input type="hidden" name="action" value="edit"></input>
      <input type="hidden" name="id" value={extra.id}></input>
      <h1 className="font-bold text-big">Edit biaya lainnya</h1>

      <Field error={error?.name} label="Nama*">
        <Input
          type="text"
          className="outline"
          name="name"
          required
          defaultValue={extra.name}
          aria-autocomplete="list"
        />
      </Field>
      <Field error={error?.value} label="Nilai*">
        <Input
          type="number"
          className="outline w-[300px]"
          name="value"
          required
          defaultValue={extra.value}
          step={0.00001}
          aria-autocomplete="list"
        />
      </Field>
      <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
        <Label className="text-3xl">Jenis:</Label>
        <select
          name="kind"
          defaultValue={extra.kind}
          className="h-[54px] w-fit outline text-normal"
        >
          <option value="number">Angka</option>
          <option value="percent">Persen</option>
        </select>
      </div>
      <TextError>{error?.global}</TextError>
      <div className="flex items-center justify-between">
        <Button className="w-fit" type="submit">
          Simpan
          <Spinner when={loading} />
        </Button>
        <DeleteBtn name={extra.name} />
      </div>
      <TextError>{error?.global}</TextError>
    </Form>
  );
}
