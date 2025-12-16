import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./DeleteBtn";
import { memo, useEffect, useRef } from "react";
import { Form, useSubmit } from "react-router";
import { useLoading } from "~/hooks/use-loading";
import { Customer } from "~/database/customer/get-all";
import { Show } from "~/components/Show";
import { Loader2 } from "lucide-react";

export const Item = memo(function ({ customer }: { customer: Customer }) {
  const loading = useLoading();
  const refName = useRef<HTMLInputElement>(null);
  const refPhone = useRef<HTMLInputElement>(null);
  const refForm = useRef<HTMLFormElement>(null);
  const submit = useSubmit();
  useEffect(() => {
    if (refName.current === null || refForm.current === null || refPhone.current === null) return;
    function handleSubmit(e: KeyboardEvent) {
      if (e.key === "Enter") {
        const formdata = new FormData();
        formdata.set("action", "edit");
        formdata.set("id", customer.id.toString());
        formdata.set("name", refName.current!.value);
        formdata.set("phone", refPhone.current!.value);
        submit(formdata, { method: "POST" });
      }
    }
    refName.current.addEventListener("keydown", handleSubmit);
    refPhone.current.addEventListener("keydown", handleSubmit);
    return () => {
      refName.current?.removeEventListener("keydown", handleSubmit);
      refPhone.current?.removeEventListener("keydown", handleSubmit);
    };
  }, []);
  return (
    <Form method="POST" ref={refForm} className="flex items-center px-0.5 gap-3">
      <input type="hidden" name="action" value="edit"></input>
      <input type="hidden" name="id" value={customer.id}></input>
      <Input
        ref={refName}
        type="text"
        defaultValue={customer.name}
        name="name"
        aria-autocomplete="list"
      />
      <Input
        type="number"
        ref={refPhone}
        defaultValue={customer.phone}
        name="phone"
        aria-autocomplete="list"
      />
      <Show when={!loading} fallback={<Loader2 className="animate-spin" />}>
        <DeleteBtn name={customer.name} phone={customer.phone} id={customer.id} />
      </Show>
    </Form>
  );
});
