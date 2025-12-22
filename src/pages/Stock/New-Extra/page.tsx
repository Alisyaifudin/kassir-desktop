import { Button } from "~/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Field } from "../Field";
import { Label } from "~/components/ui/label";
import { Form, Link, useActionData } from "react-router";
import { Action } from "./action";
import { Spinner } from "~/components/Spinner";
import { useLoading } from "~/hooks/use-loading";
import { cn, sizeClass } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";

export default function Page() {
  const size = useSize();
  const error = useActionData<Action>();
  const loading = useLoading();
  return (
    <main className={cn("p-2 mx-auto w-full max-w-5xl flex flex-col gap-2", sizeClass[size])}>
      <Button asChild variant="link" className="self-start">
        <Link to="/stock?tab=additional">
          {" "}
          <ChevronLeft /> Kembali
        </Link>
      </Button>
      <h1 className="font-bold text-big">Tambah biaya lainnya</h1>
      <Form method="POST" className="flex flex-col gap-2">
        <Field error={error?.name} label="Nama*:">
          <Input
            type="text"
            className="outline w-full"
            name="name"
            required
            aria-autocomplete="list"
          />
        </Field>
        <Field error={error?.value} label="Nilai*:">
          <Input
            type="number"
            className="outline w-[300px]"
            name="value"
            required
            aria-autocomplete="list"
          />
        </Field>
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <Label className="text-normal">Jenis:</Label>
          <select name="kind" defaultValue="percent" className="w-fit outline text-normal">
            <option value="number">Angka</option>
            <option value="percent">Persen</option>
          </select>
        </div>
        <Button className="w-fit" type="submit">
          Simpan
          <Spinner when={loading} />
        </Button>
        <TextError>{error?.global}</TextError>
      </Form>
    </main>
  );
}
