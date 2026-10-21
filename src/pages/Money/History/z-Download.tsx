import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { MoneyError, type Pocket } from "~/services/money";
import { saveJson } from "~/lib/export";
import { IOError } from "~/lib/effect-error";

export function Download({ pocket }: { pocket: Pocket }) {
  const { pending, mutate } = useMutation(program);

  async function handleClick() {
    const result = await mutate(pocket);
    if (Either.isLeft(result)) {
      toast.error(errorMessage(result.left));
      return;
    }
    // `null` means the cashier cancelled the save dialog — not a failure, and
    // not a success either, so it stays silent.
    if (result.right !== null) toast.success(`Disimpan ke ${result.right}`);
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      <Spinner when={pending} />
      Unduh
    </Button>
  );
}

function errorMessage(error: MoneyError | IOError): string {
  return error instanceof MoneyError ? error.message : error.e.message;
}

/**
 * Writes the pocket's ledger as the JSON the upload dialog documents, so an
 * export can be edited and read straight back in.
 */
function program(pocket: Pocket) {
  return Effect.gen(function* () {
    const entries = yield* service.money.entries.get.all(pocket.id);
    return yield* saveJson(
      `${Date.now()}-${pocket.name}.json`,
      entries.map(({ timestamp, value, note }) => ({ timestamp, value, note })),
    );
  });
}
