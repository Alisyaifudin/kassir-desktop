import { Effect } from "effect";
import { CustomerService } from "~/services/customer";
import { DeleteDialog } from "./z-DeleteDialog";
import z from "zod";
import { Customer } from "~/services/customer/type";
import { CustomerError } from "~/services/customer/error";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Field, FieldError, FieldGroup } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { TextError } from "~/components/TextError";
import { Show } from "~/components/Show";
import { Loader2 } from "lucide-react";

export const customerListEffect = Effect.gen(function* () {
  const customerService = yield* CustomerService;
  const useCustomers = customerService.customers.useData;
  const onUpdate = customerService.update;
  const onDelete = customerService.delete;
  return function CustomerList() {
    const { data: customers } = useCustomers();
    return (
      <div className="flex flex-col gap-3">
        {customers.map((customer) => (
          <CustomerItem
            key={customer.id}
            customer={customer}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  };
});

const schema = z.object({
  name: z.string(),
  phone: z.string(),
});

type ItemProps = {
  customer: Customer;
  onUpdate: (id: string, name: string, phone: string) => Effect.Effect<void, CustomerError>;
  onDelete: (id: string) => Effect.Effect<void, CustomerError>;
};

function CustomerItem({ customer, onUpdate, onDelete }: ItemProps) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: { name: customer.name, phone: customer.phone },
    validators: { onSubmit: schema },
    async onSubmit({ value }) {
      const errMsg = await Effect.runPromise(
        onUpdate(customer.id, value.name, value.phone).pipe(
          Effect.as(null),
          Effect.catchAll(({ e }) => Effect.succeed(e.message)),
        ),
      );
      setError(errMsg);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col items-center px-0.5 gap-1"
    >
      <FieldGroup className="grid grid-cols-[1fr_1fr_35px] items-center gap-3">
        <form.Field name="name">
          {(field) => (
            <Field>
              <Input
                required
                placeholder="Nama"
                id={`input-${field.name}`}
                name={field.name}
                disabled={field.form.state.isSubmitting}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                aria-autocomplete="list"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <Field>
              <Input
                type="number"
                disabled={field.form.state.isSubmitting}
                id={`input-${field.name}`}
                placeholder="No Hp"
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                aria-autocomplete="list"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <button type="submit" className="hidden">
          Submit
        </button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Show when={!isSubmitting} fallback={<Loader2 className="animate-spin" />}>
              <DeleteDialog
                name={customer.name}
                phone={customer.phone}
                id={customer.id}
                onDelete={onDelete}
              />
            </Show>
          )}
        </form.Subscribe>
      </FieldGroup>
      <TextError>{error}</TextError>
    </form>
  );
}
