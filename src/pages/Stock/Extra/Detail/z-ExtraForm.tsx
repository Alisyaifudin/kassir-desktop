import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { Extra } from "~/database/extra/caches";
import { ExtraForm as ExtraFormRoot } from "../z-ExtraForm";
import { useUpdate } from "./use-update";

export function ExtraForm({ extra }: { extra: Extra }) {
  const { form, error } = useUpdate(extra);
  return (
    <ExtraFormRoot form={form}>
      <>
        <div className="flex items-center justify-between">
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => {
              return (
                <Button className="w-fit" type="submit">
                  Simpan
                  <Spinner when={isSubmitting} />
                </Button>
              );
            }}
          </form.Subscribe>
          <DeleteBtn id={extra.id} name={extra.name} />
        </div>
        <TextError>{error}</TextError>
      </>
    </ExtraFormRoot>
  );
}
