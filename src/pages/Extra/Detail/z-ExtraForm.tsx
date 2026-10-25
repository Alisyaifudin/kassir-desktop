import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { DeleteBtn } from "./z-DeleteBtn";
import { Spinner } from "~/components/Spinner";
import { ExtraForm as ExtraFormRoot } from "../z-ExtraForm";
import { useExtraForm } from "../use-extra-form";
import type { Extra } from "~/services/extra";

export function ExtraForm({ extra }: { extra: Extra }) {
  const { form, error } = useExtraForm(extra);
  return (
    <main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
      <h1 className="font-bold text-big">Edit biaya lainnya</h1>
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
    </main>
  );
}
