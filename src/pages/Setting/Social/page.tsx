import { Item } from "./z-Item";
import { ForEach } from "~/components/ForEach";
import { cn } from "~/lib/utils";
import { NewItem } from "./z-NewItem";
import { useData } from "./use-data";
import { TextError } from "~/components/TextError";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full flex-1 overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold text-foreground">Kontak Media Sosial</h1>
        <p className="text-muted-foreground text-normal">
          Kelola kontak yang muncul di struk transaksi
        </p>
      </div>

      <div
        className={cn(
          "grid gap-2 items-center text-normal",
          "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
        )}
      >
        <p className="font-semibold text-foreground">Kontak</p>
        <p className="font-semibold text-foreground">Isian</p>
      </div>

      <Socials />

      <NewItem />
    </div>
  );
}

function Socials() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingList />;
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

function LoadingList() {
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "grid gap-2 items-center text-normal",
            "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
          )}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
