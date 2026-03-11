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
import { Show } from "~/components/Show";
import { MethodFull } from "~/database-effect/method/get-all";
import { TextError } from "~/components/TextError";
import { useGetMethods } from "~/hooks/use-get-methods";
import { Result } from "~/lib/result";
import { Loading } from "~/components/Loading";
import { log } from "~/lib/log";
import { DEFAULT_METHODS, METHOD_NAMES } from "~/lib/constants";
import { setMethods, useMethod, useMethods } from "../use-method";

export function Filter() {
  const res = useGetMethods((methods) => {
    const combined = [...methods, ...DEFAULT_METHODS];
    setMethods(combined);
  });
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError(error) {
      log.error(error.e);
      return <TextError>{error.e.message}</TextError>;
    },
    onSuccess() {
      return <Wrapper />;
    },
  });
}

function Wrapper() {
  const [method, setMethod] = useMethod();
  const methods = useMethods();
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

function groupMethods(methods: MethodFull[]): { top: MethodFull; options: MethodFull[] }[] {
  return [
    filterMethod("cash", methods),
    filterMethod("transfer", methods),
    filterMethod("debit", methods),
    filterMethod("qris", methods),
  ];
}
function filterMethod(name: DB.MethodEnum, methods: MethodFull[]) {
  const top = methods.find((m) => m.kind === name && m.name === undefined);
  if (top === undefined) throw new Error("No " + name);
  const options = methods.filter((m) => m.kind === name && m.name !== undefined);
  return { top, options };
}
