import { Effect, Either } from "effect";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { saveBackup } from "~/lib/backup";
import { log } from "~/lib/log";
import { service } from "~/services";
import { formatSize, messageOf } from "./util-file";

export function useBackup() {
  const { pending, error, mutate } = useMutation(program);

  async function handleBackup() {
    const result = await mutate(undefined);
    if (Either.isLeft(result)) {
      log.error(messageOf(result.left));
      return;
    }
    // `null` = the cashier cancelled the save dialog: silent, not "success".
    if (result.right !== null) {
      toast.success(`Cadangan ${formatSize(result.right.bytes)} disimpan ke ${result.right.path}`);
    }
  }

  return {
    handleBackup,
    loading: pending,
    error: error === null ? null : messageOf(error),
  };
}

/**
 * The store is read before the dialog opens, so the archive is a moment in time
 * rather than two reads seconds apart.
 */
function program() {
  return Effect.gen(function* () {
    const store = yield* service.store.entries();
    return yield* saveBackup(store);
  });
}
