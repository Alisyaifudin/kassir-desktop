import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./z-DeleteBtn";
import { memo, useEffect, useRef } from "react";
import { Customer } from "~/database/customer/get-all";
import { Show } from "~/components/Show";
import { Loader2 } from "lucide-react";
import { useSubmit } from "~/hooks/use-submit";
import { TextError } from "~/components/TextError";
import { Effect } from "effect";
import { db } from "~/database-effect";
import { log } from "~/lib/utils";
import { revalidate } from "~/hooks/use-micro";
import { KEY } from "./loader";

export const Item = memo(function ({ customer }: { customer: Customer }) {
  const { error, handleSubmit, loading } = useSubmit(
    async () => {
      if (ref.phone.current === null || ref.name.current === null) return null;
      const phone = ref.phone.current.value;
      const name = ref.name.current.value;
      return Effect.runPromise(program({ id: customer.id, name, phone }));
    },
    () => revalidate(KEY),
  );
  const ref = useForm();
  return (
    <form onSubmit={handleSubmit} ref={ref.form} className="flex items-center px-0.5 gap-3">
      <Input
        ref={ref.name}
        type="text"
        defaultValue={customer.name}
        name="name"
        aria-autocomplete="list"
      />
      <Input
        type="number"
        ref={ref.phone}
        defaultValue={customer.phone}
        name="phone"
        aria-autocomplete="list"
      />
      <Show when={!loading} fallback={<Loader2 className="animate-spin" />}>
        <DeleteBtn name={customer.name} phone={customer.phone} id={customer.id} />
      </Show>
      <TextError>{error}</TextError>
    </form>
  );
});

function useForm() {
  const refName = useRef<HTMLInputElement>(null);
  const refPhone = useRef<HTMLInputElement>(null);
  const refForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (refName.current === null || refForm.current === null || refPhone.current === null) return;
    function handleSubmit(e: KeyboardEvent) {
      if (e.key === "Enter" && refForm.current !== null) {
        refForm.current.requestSubmit();
      }
    }
    refName.current.addEventListener("keydown", handleSubmit);
    refPhone.current.addEventListener("keydown", handleSubmit);
    return () => {
      refName.current?.removeEventListener("keydown", handleSubmit);
      refPhone.current?.removeEventListener("keydown", handleSubmit);
    };
  }, []);
  return { phone: refPhone, name: refName, form: refForm };
}

function program({ id, name, phone }: { id: number; name: string; phone: string }) {
  return Effect.gen(function* () {
    yield* db.customer.update(id, name, phone);
    return null;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      log.error(JSON.stringify(e.stack));
      return Effect.succeed(e.message);
    }),
  );
}
