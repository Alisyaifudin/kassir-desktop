import { Item } from "./z-Item";
import { ForEach } from "~/components/ForEach";
import { Suspense } from "react";
import { cn, log } from "~/lib/utils";
import { NewItem } from "./z-NewItem";
import { KEY, loader } from "./loader";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";
import { useMicro } from "~/hooks/use-micro";
import { Either } from "effect";

export default function Page() {
  const size = useSize();
  return (
    <div className="flex flex-col gap-2 w-full flex-1 overflow-hidden">
      <h1 className="font-bold text-big">Daftar Kontak</h1>
      <div className={cn("grid gap-2 items-center text-normal", css.item[size])}>
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
  const res = useMicro({
    fn: () => loader(),
    key: KEY,
  });
  return Either.match(res, {
    onLeft({ e }) {
      log.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight(socials) {
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
