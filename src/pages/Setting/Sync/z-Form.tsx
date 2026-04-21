import { Effect } from "effect";
import { useState } from "react";
import { log } from "~/lib/log";
import { store } from "~/store";
import { revalidate } from "./use-data";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";

export function Form({ token }: { token?: string }) {
  const { value, error, handleChange, handleSubmit, loading } = useToken(token);
  return (
    <div className="flex justify-between items-center mb-4">
      <form onSubmit={handleSubmit}>
        <Field>
          <FieldLabel htmlFor="sync-token" className="text-normal font-semibold text-foreground">
            Token
          </FieldLabel>
          <Input id="sync-token" value={value} onChange={handleChange} placeholder="token..." />
        </Field>
        <Button disabled={loading}>
          <Spinner when={loading} />
          Simpan
        </Button>
        <FieldError>{error}</FieldError>
      </form>
    </div>
  );
}

export function useToken(init?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [token, setToken] = useState(init ?? "");
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) {
      return;
    }
    setLoading(true);
    const errMsg = await Effect.runPromise(
      store.sync.token.set(token).pipe(
        Effect.as(null),
        Effect.catchTag("StoreError", ({ e }) => {
          log.error(e);
          return Effect.succeed(e.message);
        }),
      ),
    );
    setLoading(false);
    setError(errMsg);
    if (errMsg === null) {
      revalidate();
    }
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.currentTarget.value;
    setToken(val);
  }
  return {
    value: token,
    loading,
    error,
    handleSubmit,
    handleChange,
  };
}
