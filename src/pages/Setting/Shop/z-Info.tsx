import { memo } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useUpdate } from "./use-update";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import type { Info as InfoModel } from "~/services/info";
import { PendingValue } from "~/components/page-data";

/**
 * Field labels are part of the form's static half, so the skeleton and the form
 * read them from here — one list, so the two states can never disagree about
 * which field is which.
 */
const LABELS = {
  owner: "Nama Toko",
  address: "Alamat",
  header: "Deskripsi Atas:",
  footer: "Deskripsi Bawah:",
} as const;

export const Info = memo(function Info({ info }: { info: InfoModel }) {
  const { form, error } = useUpdate({
    owner: info.owner,
    address: info.address,
    header: info.header,
    footer: info.footer,
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-2 p-0.5"
    >
      <form.Field name="owner">
        {(field) => (
          <FieldText
            label={<FieldLabel htmlFor={`input-${field.name}`}>{LABELS.owner}</FieldLabel>}
            error={<FieldError errors={field.state.meta.errors} />}
          >
            <Input
              value={field.state.value}
              onBlur={field.handleBlur}
              disabled={field.form.state.isSubmitting}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              id={`input-${field.name}`}
              aria-autocomplete="list"
            />
          </FieldText>
        )}
      </form.Field>
      <form.Field name="address">
        {(field) => (
          <FieldText
            label={<FieldLabel htmlFor={`input-${field.name}`}>{LABELS.address}</FieldLabel>}
            error={<FieldError errors={field.state.meta.errors} />}
          >
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              onBlur={field.handleBlur}
              disabled={field.form.state.isSubmitting}
              id={`input-${field.name}`}
              aria-autocomplete="list"
            />
          </FieldText>
        )}
      </form.Field>
      <form.Field name="header">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`input-${field.name}`}>{LABELS.header}</FieldLabel>
            <Textarea
              rows={3}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              onBlur={field.handleBlur}
              disabled={field.form.state.isSubmitting}
              id={`input-${field.name}`}
              aria-autocomplete="list"
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name="footer">
        {(field) => (
          <Field>
            <FieldLabel htmlFor={`input-${field.name}`}>{LABELS.footer}</FieldLabel>
            <Textarea
              rows={3}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              onBlur={field.handleBlur}
              disabled={field.form.state.isSubmitting}
              id={`input-${field.name}`}
              aria-autocomplete="list"
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <TextError>{error}</TextError>
      <form.Subscribe selector={(e) => e.isSubmitting}>
        {(isSubmitting) => (
          <Button disabled={isSubmitting}>
            Simpan <Spinner when={isSubmitting} />
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
});

/**
 * The form before its values: same rows, same labels, same gaps, with the
 * controls disabled and pulsing. The button is drawn too — it is static — so the
 * panel's height is already the height it will keep.
 */
export function InfoSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-0.5" aria-busy="true" aria-label="Memuat identitas toko">
      <FieldText label={<FieldLabel>{LABELS.owner}</FieldLabel>} error={null}>
        <PendingValue>
          <Input disabled />
        </PendingValue>
      </FieldText>
      <FieldText label={<FieldLabel>{LABELS.address}</FieldLabel>} error={null}>
        <PendingValue>
          <Input disabled />
        </PendingValue>
      </FieldText>
      <Field>
        <FieldLabel>{LABELS.header}</FieldLabel>
        <PendingValue pulse="left-3 top-3 w-40">
          <Textarea rows={3} disabled />
        </PendingValue>
      </Field>
      <Field>
        <FieldLabel>{LABELS.footer}</FieldLabel>
        <PendingValue pulse="left-3 top-3 w-40">
          <Textarea rows={3} disabled />
        </PendingValue>
      </Field>
      {/* The save button is static chrome, not a value. */}
      <Button disabled className="w-fit">
        Simpan
      </Button>
    </div>
  );
}

function FieldText({
  children,
  label,
  error,
}: {
  children: React.ReactNode;
  label: React.ReactNode;
  error: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 ">
      <div className="grid grid-cols-[160px_1fr] small:grid-cols-[100px_1fr] text-normal items-center gap-1">
        {label}
        {children}
      </div>
      {error}
    </div>
  );
}
