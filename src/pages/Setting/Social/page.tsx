import { Item } from "./Item";
import { ForEach } from "~/components/ForEach";
import { Suspense, use } from "react";
import { cn, Result } from "~/lib/utils";
import { NewItem } from "./NewItem";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { Social } from "~/database/social/get-all";
import { useSize } from "~/hooks/use-size";
import { css } from "./style.css";

export default function Page() {
  const socials = useLoaderData<Loader>();
  const size = useSize();
  return (
    <div className="flex flex-col gap-2 w-full flex-1 overflow-hidden">
      <h1 className="font-bold text-big">Daftar Kontak</h1>
      <div className={cn("grid gap-2 items-center text-normal", css.item[size])}>
        <p>Kontak</p>
        <p>Isian</p>
      </div>
      <Suspense fallback={<Loading />}>
        <Socials socials={socials} />
      </Suspense>
      <NewItem />
    </div>
  );
}

function Socials({
  socials: promise,
}: {
  socials: Promise<Result<"Aplikasi bermasalah", Social[]>>;
}) {
  const [errMsg, socials] = use(promise);
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  if (socials.length === 0) {
    return <p className="text-big">---Belum Ada---</p>;
  }
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      <ForEach items={socials}>{(s) => <Item id={s.id} name={s.name} value={s.value} />}</ForEach>
    </div>
  );
}
