import { Either } from "effect";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { Customer, CustomerInput } from "~/services/customer";

const schema = z.object({
  name: z.string().trim().nonempty("Harus ada"),
  phone: z.string().trim(),
});

/** A customer as the form needs it: the id to write, the values to show. */
export type EditableCustomer = Pick<Customer, "id" | "name" | "phone">;

const EMPTY: EditableCustomer = { id: "", name: "", phone: "" };

/**
 * The one customer form. `customer` is absent when adding, so the only
 * difference between add and edit is which service write `onSubmit` calls;
 * `onSuccess` closes the add dialog.
 */
export function useCustomerForm(customer?: EditableCustomer, onSuccess?: () => void) {
  const { error, mutate } = useMutation((input: CustomerInput) =>
    customer === undefined
      ? service.customer.add(input.name, input.phone)
      : service.customer.set.info(customer.id, input),
  );

  // Read only at mount: a write must not wipe out what is being typed.
  const initial = customer ?? EMPTY;

  const form = useForm({
    defaultValues: { name: initial.name, phone: initial.phone },
    validators: {
      onSubmit: schema,
    },
    async onSubmit({ value }) {
      const result = await mutate({ name: value.name.trim(), phone: value.phone.trim() });
      if (Either.isLeft(result)) return;
      // Only the dialog is cleared; a row keeps the text that was just saved.
      if (customer === undefined) form.reset();
      onSuccess?.();
    },
  });

  return { form, error: error?.message ?? null };
}
