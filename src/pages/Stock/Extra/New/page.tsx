import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Link } from "react-router";
import { Spinner } from "~/components/Spinner";
import { cn } from "~/lib/utils";
import { ExtraForm } from "../z-ExtraForm";
import { useSubmit } from "./use-submit";

export default function Page() {
  const { error, form } = useSubmit();
  return (
    <main className={cn("p-2 mx-auto w-full max-w-5xl flex flex-col gap-2")}>
      <Button asChild variant="link" className="self-start">
        <Link to="/stock?tab=additional">
          {" "}
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <h1 className="font-bold text-big">Tambah biaya lainnya</h1>
      <ExtraForm form={form}>
        <>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button className="w-fit" type="submit">
                Simpan
                <Spinner when={isSubmitting} />
              </Button>
            )}
          </form.Subscribe>
          <TextError>{error}</TextError>
        </>
      </ExtraForm>
    </main>
  );
}
