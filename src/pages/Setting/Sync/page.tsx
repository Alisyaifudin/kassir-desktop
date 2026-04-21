import { TextError } from "~/components/TextError";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { useData } from "./use-data";
import { Sync } from "./z-Sync";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Sinkronisasi</h1>
        <p className="text-muted-foreground text-normal">Sinkronisasi data ke awan</p>
      </div>
      <DataLoader />
    </div>
  );
}

function DataLoader() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <p>loading</p>;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(token) {
      return <Sync token={token} />;
    },
  });
}
