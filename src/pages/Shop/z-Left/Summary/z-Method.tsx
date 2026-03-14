import { useEffect } from "react";
import { TextError } from "~/components/TextError";
import { tx } from "~/transaction";
import { useAtom } from "@xstate/store/react";
import { Kbd } from "~/components/ui/kdb";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { METHOD_BASE_ID } from "~/lib/constants";
import { useGetMethods } from "~/hooks/use-get-methods";
import { basicStore } from "../../use-transaction";
import { Result } from "~/lib/result";
import { Skeleton } from "~/components/ui/skeleton";
import { log } from "~/lib/log";
import { Loading } from "~/components/Loading";
import { useTab } from "../../use-tab";
import { queue } from "../../util-queue";

export function Method() {
  const res = useGetMethods();
  return Result.match(res, {
    onLoading() {
      return <Skeleton className="w-[100px] self-stretch" />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess([methods, defaultMethods]) {
      const transformed = methods.map((m) => ({
        ...m,
        isDefault: defaultMethods[m.kind] === m.id,
      }));
      return (
        <Wrapper
          methods={[{ kind: "cash", id: METHOD_BASE_ID.cash, isDefault: true }, ...transformed]}
        />
      );
    },
  });
}

type MethodDB = {
  isDefault: boolean;
  id: number;
  name?: string;
  kind: "cash" | "transfer" | "debit" | "qris";
};

const methodLabel = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  debit: "Debit",
} as const;
const methodKbd = {
  cash: "Ctrl+0",
  qris: "Ctrl+1",
  transfer: "Ctrl+2",
  debit: "Ctrl+3",
} as const;

function Wrapper({ methods }: { methods: MethodDB[] }) {
  const method = useMethod(methods);
  const [tab] = useTab();
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey) return;
      switch (e.key) {
        case "0":
          selectMethod("cash", defVals, tab);
          break;
        case "1":
          selectMethod("qris", defVals, tab);
          break;
        case "2":
          selectMethod("transfer", defVals, tab);
          break;
        case "3":
          selectMethod("debit", defVals, tab);
          break;
      }
    }
    document.body.addEventListener("keydown", handleKey);
    return () => {
      document.body.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (method === undefined) return <Loading />;
  const suboption = methods.filter((m) => m.kind === method.kind && m.name !== undefined);
  const defVals = methods.filter((m) => m.isDefault);
  return (
    <div className="flex items-center gap-3 flex-1">
      <Select
        value={method.kind}
        onValueChange={(e) => {
          const val = e as DB.MethodEnum;
          selectMethod(val, defVals, tab);
        }}
      >
        <SelectTrigger className="w-[200px] small:w-[165px]">
          <SelectValue placeholder="Metode">
            {methodLabel[method.kind]} <Kbd>{methodKbd[method.kind]}</Kbd>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup className="w-[200px] small:w-[150px]">
            <SelectItem className="text-small!" kbd={<Kbd>Ctrl+0</Kbd>} value="cash">
              Tunai
            </SelectItem>
            <SelectItem kbd={<Kbd>Ctrl+1</Kbd>} value="qris">
              QRIS
            </SelectItem>
            <SelectItem kbd={<Kbd>Ctrl+2</Kbd>} value="transfer">
              Transfer
            </SelectItem>
            <SelectItem kbd={<Kbd>Ctrl+3</Kbd>} value="debit">
              Debit
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      {suboption.length > 0 ? (
        <Select
          value={method.id.toString()}
          onValueChange={(val) => {
            const num = Number(val);
            if (isNaN(num)) return;
            if (methods.find((m) => m.id === num) === undefined) return;
            setMethod(num);
            queue.add(tx.transaction.update.methodId(tab, num));
          }}
        >
          <SelectTrigger className="w-[200px] small:w-[140px]">
            <SelectValue placeholder="--Pilih--">{method.name ?? "--Pilih--"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup className="w-[200px] small:w-[140px]">
              <SelectItem value={METHOD_BASE_ID[method.kind].toString()}>--Pilih--</SelectItem>
              {suboption.map((m) => (
                <SelectItem value={m.id.toString()} key={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <div className="w-[200px] small:w-[140px]" />
      )}
    </div>
  );
}

function useMethod(methods: MethodDB[]): MethodDB | undefined {
  const methodId = useAtom(basicStore, (state) => state.methodId);
  const find = methods.find((m) => m.id === methodId);
  useEffect(() => {
    if (find === undefined) {
      setMethod(METHOD_BASE_ID.cash);
    }
  }, [methodId, find]);
  return find;
}

function setMethod(methodId: number) {
  basicStore.set((prev) => ({ ...prev, methodId }));
}

function selectMethod(val: DB.MethodEnum, defVals: MethodDB[], tab: number) {
  const defVal = defVals.find((m) => m.kind === val);
  if (defVal === undefined) {
    const methodId = METHOD_BASE_ID[val];
    setMethod(methodId);
    queue.add(tx.transaction.update.methodId(tab, methodId));
  } else {
    setMethod(defVal.id);
    queue.add(tx.transaction.update.methodId(tab, defVal.id));
  }
}
