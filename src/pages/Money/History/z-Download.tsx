import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { db } from "~/database";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { IOError } from "~/lib/effect-error";

export function Download({ kindId, kind }: { kindId: number; kind: string }) {
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    const errMsg = await Effect.runPromise(program(kindId, kind));
    setLoading(false);
    if (errMsg !== null) {
      toast.error(errMsg);
    }
  }
  return (
    <Button onClick={handleClick} disabled={loading}>
      <Spinner when={loading} />
      Unduh
    </Button>
  );
}

function program(kindId: number, kind: string) {
  return Effect.gen(function* () {
    const money = yield* db.money.get.all(kindId);
    const json = JSON.stringify(money, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const data = yield* Effect.tryPromise({
      try: () => blob.bytes(),
      catch: (e) => new IOError(e),
    });
    const filePath = yield* Effect.tryPromise({
      try: () =>
        save({
          title: "Simpan Data",
          defaultPath: `${Date.now()}-${kind}.json`,
          filters: [{ name: "JSON", extensions: ["json"] }],
        }),
      catch: (e) => new IOError(e),
    });
    if (filePath === null) return null;
    yield* Effect.tryPromise({
      try: () => writeFile(filePath, data),
      catch: (e) => new IOError(e),
    });
    return null;
  }).pipe(
    Effect.catchTag("DbError", ({ e }) => {
      return Effect.succeed(e.message);
    }),
  );
}
