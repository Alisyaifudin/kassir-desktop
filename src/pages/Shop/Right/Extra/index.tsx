import { extrasStore, useInitExtras } from "./use-extras";
import { TextError } from "~/components/TextError";
import { useSelector } from "@xstate/store/react";
import { Subtotal } from "./Subtotal";
import { ForEach } from "~/components/ForEach";
import { Item } from "./Item";

export function ExtraList() {
  const errMsg = useInitExtras();
  if (errMsg) return <TextError>{errMsg}</TextError>;
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
