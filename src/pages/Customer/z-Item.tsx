import { Input } from "~/components/ui/input";
import { DeleteBtn } from "./z-DeleteBtn";
import { memo } from "react";
import type { Customer } from "~/services/customer";
import { Show } from "~/components/Show";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { useCustomerForm } from "./use-customer-form";
import { Field, FieldError, FieldGroup } from "~/components/ui/field";
import eq from "fast-deep-equal";

/**
 * One customer, edited in place: the write runs on submit (Enter, or the hidden
 * submit button), so there is no save button to reach for.
 */
export const Item = memo(function Item({ customer }: { customer: Customer }) {
  const { form, error } = useCustomerForm(customer);
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
              <FieldError errors={field.state.meta.errors}></FieldError>
            </Field>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <Field>
              <Input
                placeholder="No Hp"
                id={`input-${field.name}`}
                name={field.name}
                disabled={field.form.state.isSubmitting}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.currentTarget.value)}
                onBlur={field.handleBlur}
                aria-autocomplete="list"
              />
              <FieldError errors={field.state.meta.errors}></FieldError>
            </Field>
          )}
        </form.Field>
        <button type="submit" className="hidden">
          Submit
        </button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Show when={!isSubmitting} fallback={<Loader2 className="animate-spin" />}>
              <DeleteBtn name={customer.name} phone={customer.phone} id={customer.id} />
            </Show>
          )}
        </form.Subscribe>
      </FieldGroup>
      <TextError>{error}</TextError>
    </form>
  );
}, eq);
