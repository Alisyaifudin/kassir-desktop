import { Button } from "~/components/ui/button";
import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { useBack } from "~/services/route/react";
import { ExtraForm } from "../z-ExtraForm";
import { useExtraForm } from "../use-extra-form";

export default function Page() {
  const { form, error } = useExtraForm();
  const back = useBack("/extras");
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-2">
      <header className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl">Tambah biaya lainnya</h1>
        <p className="text-sm text-muted-foreground">
          Biaya di luar harga barang — ongkir, kemasan, potongan — yang ditambahkan ke transaksi.
        </p>
      </header>
      <ExtraForm form={form}>
        <>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="secondary" onClick={back}>
              Batal
            </Button>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button className="w-fit" type="submit" disabled={isSubmitting}>
                  Simpan
                  <Spinner when={isSubmitting} />
                </Button>
              )}
            </form.Subscribe>
          </div>
          <TextError>{error}</TextError>
        </>
      </ExtraForm>
    </main>
  );
}
