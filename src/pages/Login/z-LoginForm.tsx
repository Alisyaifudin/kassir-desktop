import { useRef } from "react";
import { Password } from "~/components/Password";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { capitalize, cn } from "~/lib/utils";
import type { Cashier } from "~/services/cashier";
import { useLoginForm } from "./use-login-form";
import { FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";

const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

function avatarColor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function LoginForm({ cashiers }: { cashiers: Cashier[] }) {
  const { form, error } = useLoginForm();
  const passwordRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="mb-6 flex flex-col gap-1 small:mb-5">
        <h1 className="text-big font-bold tracking-tight">Selamat datang 👋</h1>
        <p className="text-muted-foreground">Pilih akun dan masukkan kata sandi untuk masuk.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-6 small:gap-5"
      >
        <FieldGroup className="gap-6 small:gap-5">
          <form.Field name="id">
            {(field) => (
              <div className="flex flex-col gap-3 small:gap-2">
                <FieldLabel>Pilih Akun</FieldLabel>
                <div className="grid max-h-64 grid-cols-1 gap-3 overflow-y-auto scroll-gutter pr-1 small:max-h-52 small:gap-2 xs:grid-cols-2">
                  {cashiers.map((cashier) => {
                    const selected = field.state.value === cashier.id;
                    return (
                      <button
                        key={cashier.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          field.handleChange(cashier.id);
                          passwordRef.current?.focus();
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 text-small text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring small:gap-2 small:p-2",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40 hover:bg-accent",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white small:size-9 small:text-lg",
                            avatarColor(cashier.id),
                          )}
                        >
                          {capitalize(cashier.name).charAt(0)}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-small font-semibold">
                            {capitalize(cashier.name)}
                          </span>
                          <span className="text-tiny text-muted-foreground">
                            {cashier.role === "admin" ? "Admin" : "Kasir"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="flex flex-col gap-3 small:gap-2">
                <FieldLabel htmlFor={`input-${field.name}`}>Kata sandi</FieldLabel>
                <Password
                  ref={passwordRef}
                  id={`input-${field.name}`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  onBlur={field.handleBlur}
                  aria-autocomplete="list"
                  placeholder="••••••••"
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <TextError>{error}</TextError>

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <form.Subscribe selector={(state) => state.values.id}>
                {(id) => (
                  <Button type="submit" className="w-full" disabled={isSubmitting || id === ""}>
                    Masuk
                    <Spinner when={isSubmitting} />
                  </Button>
                )}
              </form.Subscribe>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </>
  );
}
