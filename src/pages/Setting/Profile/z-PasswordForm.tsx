import { Password } from "~/components/Password";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useUpdatePassword } from "./use-update-password";

/**
 * The change-password form, in the same shape as the name form above it: label in
 * a fixed column, control beside it, one button at the right edge.
 *
 * It used to sit inside a disclosure on a solid red panel. The red was the loudest
 * thing on the screen for a routine form, and the panel head already says "Kata
 * Sandi" — the disclosure only hid the one field it contained.
 */
export function PasswordForm() {
  const { error, handleSubmit, loading, password } = useUpdatePassword();
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label
        className={cn(
          "grid items-center gap-2 text-normal",
          "grid-cols-[250px_1fr] small:grid-cols-[160px_1fr]",
        )}
      >
        Kata Sandi Baru
        <Password
          value={password.value}
          disabled={loading}
          onChange={(e) => password.set(e.currentTarget.value)}
          name="password"
          aria-autocomplete="list"
        />
      </label>
      <Button disabled={loading} className="w-fit self-end">
        Simpan <Spinner when={loading} />
      </Button>
      <TextError>{error}</TextError>
    </form>
  );
}
