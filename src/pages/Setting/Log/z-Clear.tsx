import { Either } from "effect";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";

export function Clear() {
  const { pending, error, mutate } = useMutation(service.logs.clear);
  async function handleClear() {
    const result = await mutate(undefined);
    if (Either.isLeft(result)) log.error(result.left.message);
  }
  return (
    <div className="flex items-center gap-2">
      <TextError>{error?.message ?? null}</TextError>
      <Button onClick={handleClear} variant="destructive">
        <Spinner when={pending} />
        Bersihkan
      </Button>
    </div>
  );
}
