import { Effect } from "effect";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "~/components/Spinner";
import { Button } from "~/components/ui/button";
import { MoneyService } from "~/services/money";
import { IoService } from "~/services/io";
import { BlobService } from "~/services/blob";

export const download = Effect.gen(function* () {
  const moneyService = yield* MoneyService;
  const ioService = yield* IoService;
  const blobService = yield* BlobService;
  const onDownload = (pocketId: string, name: string) =>
    program(pocketId, name).pipe(
      Effect.provideService(MoneyService, moneyService),
      Effect.provideService(IoService, ioService),
      Effect.provideService(BlobService, blobService),
    );
  const usePocket = () => moneyService.money.usePocket();
  return function Download({ pocketId }: { pocketId: string }) {
    const pocket = usePocket();
    const [loading, setLoading] = useState(false);
    async function handleClick() {
      setLoading(true);
      const errMsg = await Effect.runPromise(onDownload(pocketId, pocket.name));
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
  };
});

function program(pocketId: string, name: string) {
  return Effect.gen(function* () {
    const moneyService = yield* MoneyService;
    const ioService = yield* IoService;
    const blobService = yield* BlobService;
    const money = yield* moneyService.money.all(pocketId);
    const data = yield* blobService.convert.fromObject(money);
    const fileName = `${Date.now()}-${name}.json`;
    const filePath = yield* ioService.dialog({
      title: "Simpan Data",
      defaultPath: fileName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    yield* ioService.save(filePath, data);
    return null;
  }).pipe(Effect.catchAll(({ e }) => Effect.succeed(e.message)));
}
