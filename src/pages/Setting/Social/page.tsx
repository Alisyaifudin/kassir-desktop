import { Item } from "./z-Item";
import { ForEach } from "~/components/ForEach";
import { Suspense } from "react";
import { cn } from "~/lib/utils";
import { NewItem } from "./z-NewItem";
import { useData } from "./use-data";
import { TextError } from "~/components/TextError";
import { Loading, LoadingFull } from "~/components/Loading";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 w-full flex-1 overflow-hidden">
      <h1 className="font-bold text-big">Daftar Kontak</h1>
      <div
        className={cn(
          "grid gap-2 items-center text-normal",
          "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
        )}
      >
        <p>Kontak</p>
        <p>Isian</p>
      </div>
      <Suspense fallback={<Loading />}>
        <Socials />
      </Suspense>
      <NewItem />
    </div>
  );
}

function Socials() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingFull />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(socials) {
      if (socials.length === 0) return <p className="text-big">---Belum Ada---</p>;
      return (
        <div className="flex flex-col gap-1 overflow-y-auto">
          <ForEach items={socials}>
            {(s) => <Item id={s.id} name={s.name} value={s.value} />}
          </ForEach>
        </div>
      );
    },
  });
}
