import { useState } from "react";
import { Effect, Either } from "effect";
import { extractMoney, MAXIMUM_SIZE, MoneyImport } from "./util-validate-money";
import { log } from "~/lib/log";
import { TextError } from "~/components/TextError";
import { Selected } from "./z-Selected";
import { Show } from "~/components/Show";
import { FileDropZone } from "~/components/FileDropZone";
import { Loading } from "./z-Loading";

export function Content({ pocketId }: { pocketId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ name: string; money: MoneyImport[] } | undefined>(undefined);

  const processFiles = async (fileList: FileList) => {
    const nextFile = fileList.item(0);

    if (nextFile === null) return;
    setLoading(true);
    const either = await Effect.runPromise(Effect.either(extractMoney(nextFile)));
    setLoading(false);
    Either.match(either, {
      onLeft(e) {
        switch (e._tag) {
          case "JsonError":
            log.error(e.e);
            setError(e.e.message);
            break;
          case "TooBigError":
            setError(`Berkas terlalu besar: ${e.size}B. Maksimum ${MAXIMUM_SIZE}B`);
        }
      },
      onRight(data) {
        setError("");
        setData(data);
      },
    });
  };

  const removeFile = () => {
    setData(undefined);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="text-normal font-bold mb-2">Catatan Keuangan</h3>
      </div>
      <TextError>{error}</TextError>
      <Selected pocketId={pocketId} data={data} onRemove={removeFile} />
      <Show when={!loading && data === undefined} fallback={<Loading />}>
        <FileDropZone label="Pilih berkas catatan keuangan" onFiles={processFiles} />
      </Show>
    </div>
  );
}
