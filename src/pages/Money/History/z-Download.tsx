import { Effect, Either } from "effect";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import { MoneyError, type Pocket } from "~/services/money";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { IOError } from "~/lib/effect-error";

export function Download({ pocket }: { pocket: Pocket }) {
  const { pending, mutate } = useMutation(program);

  async function handleClick() {
    const result = await mutate(pocket);
    if (Either.isLeft(result)) toast.error(errorMessage(result.left));
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
    const json = JSON.stringify(
      entries.map(({ timestamp, value, note }) => ({ timestamp, value, note })),
      null,
      2,
    );
    const bytes = yield* Effect.tryPromise({
      try: () => new Blob([json], { type: "application/json" }).bytes(),
      catch: (e) => new IOError(e),
    });
    const filePath = yield* Effect.tryPromise({
      try: () =>
        save({
          title: "Simpan Data",
          defaultPath: `${Date.now()}-${pocket.name}.json`,
          filters: [{ name: "JSON", extensions: ["json"] }],
        }),
      catch: (e) => new IOError(e),
    });
    if (filePath === null) return;
    yield* Effect.tryPromise({
      try: () => writeFile(filePath, bytes),
      catch: (e) => new IOError(e),
    });
  });
}
