import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { ForEach } from "~/components/ForEach";
import { FilterBtn } from "./FilterBtn";
import { DefaultError, METHOD_NAMES, Result } from "~/lib/utils";
import { Show } from "~/components/Show";
import { Method } from "~/database/method/get-all";
import { useParams, useSetParams } from "../use-params";
import { use } from "react";
import { TextError } from "~/components/TextError";

export function Filter({ methods: promise }: { methods: Promise<Result<DefaultError, Method[]>> }) {
  const [errMsg, methods] = use(promise);
  if (errMsg !== null) {
    return <TextError>{errMsg}</TextError>;
  }
  return <Wrapper methods={methods} />;
}

function Wrapper({ methods }: { methods: Method[] }) {
  const method = useParams().method(methods);
  const setMethod = useSetParams().method;
  const handleClick = (id: number) => {
    setMethod(id);
  };
  const handleClear = () => {
    setMethod(null);
  };
  const group = groupMethods(methods);
  return (
    <Dialog>
      <Button asChild variant="outline">
        <DialogTrigger>
          <SlidersHorizontal />
          <Show value={method} fallback={<p>Filter</p>}>
            {(v) => (
              <p>
                {METHOD_NAMES[v.kind]} {v.name}
              </p>
            )}
          </Show>
        </DialogTrigger>
      </Button>
      {method === null ? null : (
        <Button size="icon" variant="ghost" onClick={handleClear}>
          <X />
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-normal">Filter Metode Pembayaran</DialogTitle>
          <div className="flex flex-col gap-5">
            <ForEach items={group}>
              {({ top, options }) => (
                <FilterBtn
                  key={top.id}
                  selected={method?.id ?? null}
                  onClick={handleClick}
                  options={options}
                  top={top}
                />
              )}
            </ForEach>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

function groupMethods(methods: Method[]): { top: Method; options: Method[] }[] {
  return [
    filterMethod("cash", methods),
    filterMethod("transfer", methods),
    filterMethod("debit", methods),
    filterMethod("qris", methods),
  ];
}
function filterMethod(name: DB.MethodEnum, methods: Method[]) {
  const top = methods.find((m) => m.kind === name && m.name === undefined);
  if (top === undefined) throw new Error("No " + name);
  const options = methods.filter((m) => m.kind === name && m.name !== undefined);
  return { top, options };
}
