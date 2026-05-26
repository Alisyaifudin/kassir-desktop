import { memo } from "react";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useUpdate } from "./use-update";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";

export const Info = memo(function Info(props: {
  owner: string;
  address: string;
  header: string;
  footer: string;
}) {
  const { form, error } = useUpdate(props);
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
            label={<FieldLabel htmlFor={`input-${field.name}`}>Nama Toko</FieldLabel>}
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
            label={<FieldLabel htmlFor={`input-${field.name}`}>Alamat</FieldLabel>}
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
            <FieldLabel htmlFor={`input-${field.name}`}>Deskripsi Atas:</FieldLabel>
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
            <FieldLabel htmlFor={`input-${field.name}`}>Deskripsi Bawah:</FieldLabel>
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
// function FieldDesc({ children, label }: { label: string; children: React.ReactNode }) {
//   return (
//     <label className="flex flex-col gap-1 text-normal">
//       <div>
//         <span>{label}</span>
//       </div>
//       {children}
//     </label>
//   );
// }

// function useSubmit() {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<null | string>(null);
//   async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
//     e.preventDefault();
//     const form = e.currentTarget;
//     const formdata = new FormData(form);
//     setLoading(true);
//     const error = await Effect.runPromise(program(formdata));
//     setLoading(false);
//     setError(error);
//   }
//   return { loading, error, handleSubmit };
// }

// function program(formdata: FormData) {
//   return Effect.gen(function* () {
//     const data = yield* validate(schema, {
//       owner: formdata.get("owner"),
//       header: formdata.get("header"),
//       footer: formdata.get("footer"),
//       address: formdata.get("address"),
//     });
//     yield* store.info.set.basic(data);
//     revalidate("shop");
//     return null;
//   }).pipe(
//     Effect.catchTags({
//       ZodValError: (e) => Effect.succeed(e.error.message),
//       StoreError: ({ e }) => {
//         logOld.error(JSON.stringify(e.stack));
//         return Effect.succeed(e.message);
//       },
//     }),
//   );
// }

// const schema = z.object({
//   owner: z.string(),
//   header: z.string(),
//   footer: z.string(),
//   address: z.string(),
// });
