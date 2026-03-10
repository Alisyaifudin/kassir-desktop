import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Link } from "react-router";
import { Spinner } from "~/components/Spinner";
import { useSubmit } from "./use-submit";
import { ProductForm } from "../z-ProductForm";

export default function Page() {
  const { error, form } = useSubmit();
  return (
    <main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-2">
      <Button asChild variant="link" className="self-start">
        <Link to="/stock">
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <h1 className="font-bold text-big">Tambah barang baru</h1>
      <ProductForm form={form}>
        <>
          <div className="flex items-center justify-between">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button className="w-fit" type="submit">
                  Simpan
                  <Spinner when={isSubmitting} />
                </Button>
              )}
            </form.Subscribe>
          </div>
          <TextError>{error}</TextError>
        </>
      </ProductForm>
    </main>
  );
}
