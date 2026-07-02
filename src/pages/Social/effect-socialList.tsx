import { Effect } from "effect";
import { SocialService } from "~/services/social";
import { DeleteDialog } from "./z-DeleteDialog";
import { Show } from "~/components/Show";
import { Loader2 } from "lucide-react";
import { TextError } from "~/components/TextError";
import { Field, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Social } from "~/services/social/type";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import z from "zod";

const schema = z.object({
  name: z.string().nonempty("Harus ada"),
  value: z.string().nonempty("Harus ada"),
});

export const socialListEffect = Effect.gen(function* () {
  const socialService = yield* SocialService;
  const useSocials = () => socialService.useSocials();
  const onUpdate = (social: { id: string; name: string; value: string }) =>
    socialService.set(social);
  const onDelete = (id: string) => socialService.delete(id);
  return function SocialList() {
    const socials = useSocials();
    if (socials.length === 0) return <p className="text-big">---Belum Ada---</p>;
    return (
      <div className="flex flex-col gap-1 overflow-y-auto">
        {socials.map((s) => (
          <SocialItem key={s.id} social={s} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    );
  };
});

type ItemProps = {
  social: Social;
  onUpdate: (social: { id: string; name: string; value: string }) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

function SocialItem({ social, onUpdate, onDelete }: ItemProps) {
  const [error, setError] = useState<null | string>(null);
  const form = useForm({
    defaultValues: { name: social.name, value: social.value },
    validators: { onSubmit: schema },
    async onSubmit({ value }) {
      const errMsg = await onUpdate({ id: social.id, name: value.name, value: value.value });
      setError(errMsg);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn(
        "grid gap-2 py-0.5 px-0.5 items-center",
        "grid-cols-[250px_1fr_60px] small:grid-cols-[200px_1fr_30px]",
      )}
    >
      <form.Field name="name">
        {(field) => (
          <Field>
            <Input
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              placeholder="Nama Kontak"
              aria-autocomplete="list"
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name="value">
        {(field) => (
          <Field>
            <Input
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.currentTarget.value)}
              placeholder="Isian Kontak"
              aria-autocomplete="list"
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <button type="submit" className="hidden">
        Submit
      </button>
      <form.Subscribe selector={(e) => e.isSubmitting}>
        {(isSubmitting) => (
          <Show when={!isSubmitting} fallback={<Loader2 className="animate-spin" />}>
            <DeleteDialog
              id={social.id}
              name={social.name}
              value={social.value}
              onDelete={onDelete}
            />
          </Show>
        )}
      </form.Subscribe>
      <TextError className="col-span-3">{error}</TextError>
    </form>
  );
}
