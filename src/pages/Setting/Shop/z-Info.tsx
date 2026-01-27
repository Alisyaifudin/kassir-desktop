import { memo, useState } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Effect } from "effect";
import { store } from "~/store-effect";
import { z } from "zod";
import { log } from "~/lib/utils";
import { validate } from "~/lib/validate";
import { revalidate } from "~/hooks/use-micro";

export const Info = memo(function ({
  owner,
  address,
  footer,
  header,
}: {
  owner: string;
  address: string;
  header: string;
  footer: string;
}) {
  const { loading, error, handleSubmit } = useSubmit();
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-0.5">
      <FieldText label="Nama Toko">
        <Input type="text" defaultValue={owner} name="owner" aria-autocomplete="list" />
      </FieldText>
      <FieldText label="Alamat">
        <Input type="text" defaultValue={address} name="address" aria-autocomplete="list" />
      </FieldText>
      <FieldDesc label="Deskripsi Atas:">
        <Textarea rows={3} name="header" defaultValue={header}></Textarea>
      </FieldDesc>
      <FieldDesc label="Deskripsi Bawah:">
        <Textarea rows={3} name="footer" defaultValue={footer}></Textarea>
      </FieldDesc>
      <TextError>{error}</TextError>
      <Button>
        Simpan <Spinner when={loading} />
      </Button>
    </form>
  );
});

function FieldText({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="grid grid-cols-[160px_10px_1fr] text-normal items-center gap-1">
      <span>{label}</span>:{children}
    </label>
  );
}
function FieldDesc({ children, label }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-normal">
      <div>
        <span>{label}</span>
      </div>
      {children}
    </label>
  );
}

function useSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formdata = new FormData(form);
    setLoading(true);
    const error = await Effect.runPromise(program(formdata));
    setLoading(false);
    setError(error);
  }
  return { loading, error, handleSubmit };
}

function program(formdata: FormData) {
  return Effect.gen(function* () {
    const data = yield* validate(schema, {
      owner: formdata.get("owner"),
      header: formdata.get("header"),
      footer: formdata.get("footer"),
      address: formdata.get("address"),
    });
    yield* store.info.set.basic(data);
    revalidate("shop");
    return null;
  }).pipe(
    Effect.catchTags({
      ZodValError: (e) => Effect.succeed(e.error.message),
      StoreError: ({ e }) => {
        log.error(JSON.stringify(e.stack));
        return Effect.succeed(e.message);
      },
    }),
  );
}

const schema = z.object({
  owner: z.string(),
  header: z.string(),
  footer: z.string(),
  address: z.string(),
});
