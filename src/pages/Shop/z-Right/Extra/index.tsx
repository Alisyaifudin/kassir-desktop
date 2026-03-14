import { extrasStore } from "../../store/extra";
import { TextError } from "~/components/TextError";
import { useSelector } from "@xstate/store/react";
import { Subtotal } from "./z-Subtotal";
import { ForEach } from "~/components/ForEach";
import { Item } from "./z-Item";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";

export function ExtraList() {
  const res = useData();
  return Result.match(res, {
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess() {
      return <Wrapper />;
    },
  });
}

function Wrapper() {
  const extras = useSelector(extrasStore, (state) => state.context);
  if (extras.length === 0) return;

  return (
    <div className="flex flex-col w-full min-w-0">
      <Subtotal />
      <ForEach items={extras}>{(extra) => <Item extra={extra} />}</ForEach>
    </div>
  );
}
