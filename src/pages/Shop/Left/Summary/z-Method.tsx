import { logOld } from "~/lib/utils";
import { useEffect } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { useSize } from "~/hooks/use-size";
import { tx } from "~/transaction-effect";
import { queue } from "../../utils/queue";
import { useTab } from "../../Right/Header/use-tab";
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
import { css } from "./style.css";
import { METHOD_BASE_ID } from "~/lib/constants";
import { db } from "~/database-effect";
import { Effect, Either } from "effect";
import { store } from "~/store-effect";
import { useMicro } from "~/hooks/use-micro";
import { KEY } from "~/pages/Setting/Method/use-data";
import { basicStore } from "../../use-transaction";

const selectWidth = {
  big: {
    width: "200px",
  },
  small: {
    width: "130px",
  },
};

export function Method() {
  const res = useMicro({
    fn: () => loader(),
    key: KEY,
  });
  return Either.match(res, {
    onLeft({ e }) {
      logOld.error(JSON.stringify(e.stack));
      return <TextError>{e.message}</TextError>;
    },
    onRight(methods) {
      return <Wrapper methods={methods} />;
    },
  });
}

type MethodDB = {
  isDefault: boolean;
  id: number;
  name?: string | undefined;
  kind: "cash" | "transfer" | "debit" | "qris";
};

function loader() {
  return Effect.gen(function* () {
    const [methods, defMeth] = yield* Effect.all([db.method.getAll(), store.method.get()], {
      concurrency: "unbounded",
    });
    const transformed: MethodDB[] = methods.map((m) => {
      const defVal = defMeth[m.kind];
      const method = { ...m, isDefault: m.id === defVal };
      return method;
    });
    transformed.push({ id: 1000, isDefault: true, kind: "cash" });
    return transformed;
  });
}

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

// function getTab() {
//   const tabs = tabsStore.get();
//   const search = new URLSearchParams(window.location.search);
//   if (tabs.length === 0) return undefined;
//   const last = tabs[tabs.length - 1].tab;
//   const parsed = integer.safeParse(search.get("tab"));
//   if (!parsed.success) {
//     return last;
//   }
//   const tab = parsed.data;
//   if (tabs.find((t) => t.tab === tab) === undefined) {
//     return last;
//   }
//   return tab;
// }

function Wrapper({ methods }: { methods: MethodDB[] }) {
  const method = useMethod(methods);
  const size = useSize();
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
        <SelectTrigger>
          <SelectValue placeholder="Metode">
            {methodLabel[method.kind]} <Kbd>{methodKbd[method.kind]}</Kbd>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup className={css.method[size]}>
            <SelectItem kbd={<Kbd>Ctrl+0</Kbd>} value="cash">
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
        <select
          style={selectWidth[size]}
          value={method.id}
          onChange={(e) => {
            if (tab === undefined) return;
            const val = e.currentTarget.value;
            const num = Number(val);
            if (isNaN(num)) return;
            if (methods.find((m) => m.id === num) === undefined) return;
            setMethod(num);
            queue.add(tx.transaction.update.methodId(tab, num));
          }}
          className="outline"
        >
          <option value={METHOD_BASE_ID[method.kind]}>--PILIH--</option>
          {suboption.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      ) : (
        <div style={selectWidth[size]} />
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
  }, [methodId]);
  return find;
}

function setMethod(methodId: number) {
  basicStore.set((prev) => ({ ...prev, methodId }));
}

function selectMethod(val: DB.MethodEnum, defVals: MethodDB[], tab?: number) {
  if (tab === undefined) return;
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
