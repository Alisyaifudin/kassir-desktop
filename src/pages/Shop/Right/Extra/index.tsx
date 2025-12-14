import { DefaultError, Result } from "~/lib/utils";
import { extrasStore, useInitExtras } from "./use-extras";
import { Loading } from "~/components/Loading";
import { TextError } from "~/components/TextError";
import { ForEach } from "~/components/ForEach";
import { ItemFirst, ItemRest } from "./Item";
import { Subtotal } from "./Subtotal";
import { Extra } from "~/transaction/extra/get-by-tab";
import { useStoreValue } from "@simplestack/store/react";

export function ExtraList({ extras }: { extras: Promise<Result<DefaultError, Extra[]>> }) {
  const [loading, errMsg] = useInitExtras(extras);
  if (errMsg) return <TextError>{errMsg}</TextError>;
  if (loading) return <Loading />;
  return <Wrapper />;
}
function Wrapper() {
  const extras = useStoreValue(extrasStore);
  // console.log(extras);
  if (extras.length === 0) return;
  const [first, ...rest] = extras;
  return (
    <>
      <Subtotal />
      <ItemFirst extra={first} />
      <ForEach items={rest}>
        {(extra, i) => {
          const subtotal = extras[i].subtotal;
          // console.log("rest", extras[i]);
          if (subtotal === undefined) return null;
          return <ItemRest extra={extra} prevTotal={subtotal} />;
        }}
      </ForEach>
    </>
  );
}
