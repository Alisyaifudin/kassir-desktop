import { DefaultError, Result } from "~/lib/utils";
import { extrasStore, useInitExtras } from "./use-extras";
import { Loading } from "~/components/Loading";
import { TextError } from "~/components/TextError";
import { Extra } from "~/transaction/extra/get-by-tab";
import { useSelector } from "@xstate/store/react";
import { Subtotal } from "./Subtotal";
import { ForEach } from "~/components/ForEach";
import { Item } from "./Item";

export function ExtraList({ extras }: { extras: Promise<Result<DefaultError, Extra[]>> }) {
  const [loading, errMsg] = useInitExtras(extras);
  if (errMsg) return <TextError>{errMsg}</TextError>;
  if (loading) return <Loading />;
  return <Wrapper />;
}
function Wrapper() {
  const extras = useSelector(extrasStore, (state) => state.context);
  if (extras.length === 0) return;
  return (
    <>
      <Subtotal />
      <ForEach items={extras}>{(extra) => <Item extra={extra} />}</ForEach>
    </>
  );
}
