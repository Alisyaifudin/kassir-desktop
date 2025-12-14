import { Item } from "./Item";
import { ForEach } from "~/components/ForEach";
import { Suspense, use } from "react";
import { cn, Result } from "~/lib/utils";
import { NewBtn } from "./NewItem";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { TextError } from "~/components/TextError";
import { Size } from "~/lib/store-old";
import { Loading } from "~/components/Loading";
import { css } from "./style.css";

export default function Page() {
  const { size, socials } = useLoaderData<Loader>();
  return (
    <div className="flex flex-col gap-2 w-full flex-1 overflow-auto">
      <h1 className="font-bold text-big">Daftar Kontak</h1>
      <div className={cn("grid gap-2 items-center text-normal", css.page[size])}>
        <p>Kontak</p>
        <p>Isian</p>
      </div>
      <Suspense fallback={<Loading />}>
        <Socials size={size} socials={socials} />
      </Suspense>
      <NewBtn size={size} />
    </div>
  );
}

function Socials({
  socials: promise,
  size,
}: {
  socials: Promise<Result<"Aplikasi bermasalah", DB.Social[]>>;
  size: Size;
}) {
  const [errMsg, socials] = use(promise);
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  if (socials.length === 0) {
    return <p className="text-big">---Belum Ada---</p>;
  }
  return (
    <ForEach items={socials}>
      {(s) => <Item id={s.id} name={s.name} value={s.value} size={size} />}
    </ForEach>
  );
}
