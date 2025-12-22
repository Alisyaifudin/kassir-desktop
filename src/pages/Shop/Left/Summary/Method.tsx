import { integer, METHOD_BASE_ID, Result } from "~/lib/utils";
import { use, useEffect } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { Method as MethodDB } from "../../loader/get-method";
import { basicStore } from "../../use-transaction";
import { useSize } from "~/hooks/use-size";
import { tx } from "~/transaction";
import { queue } from "../../utils/queue";
import { tabsStore, useTab } from "../../use-tab";
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

const selectWidth = {
  big: {
    width: "200px",
  },
  small: {
    width: "130px",
  },
};

export function Method({
  methods: promise,
}: {
  methods: Promise<Result<"Aplikasi bermasalah", MethodDB[]>>;
}) {
  const [errMsg, methods] = use(promise);
  if (errMsg) {
    return <TextError>{errMsg}</TextError>;
  }
  if (methods.length === 0) {
    throw new Error("Aplikasi bermasalah, metode pembayaran kosong. Perlu perbaikan ☠️");
  }
  return <Wrapper methods={methods} />;
}

function setMethod(methodId: number) {
  basicStore.set((prev) => ({ ...prev, methodId }));
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

function getTab() {
  const tabs = tabsStore.get();
  const search = new URLSearchParams(window.location.search);
  if (tabs.length === 0) return undefined;
  const last = tabs[tabs.length - 1].tab;
  const parsed = integer.safeParse(search.get("tab"));
  if (!parsed.success) {
    return last;
  }
  const tab = parsed.data;
  if (tabs.find((t) => t.tab === tab) === undefined) {
    return last;
  }
  return tab;
}

function selectMethod(val: DB.MethodEnum, defVals: MethodDB[]) {
  const tab = getTab();
  if (tab === undefined) return;
  const defVal = defVals.find((m) => m.kind === val);
  if (defVal === undefined) {
    const methodId = METHOD_BASE_ID[val];
    setMethod(methodId);
    queue.add(() => tx.transaction.update.methodId(tab, methodId));
  } else {
    setMethod(defVal.id);
    queue.add(() => tx.transaction.update.methodId(tab, defVal.id));
  }
}

function Wrapper({ methods }: { methods: MethodDB[] }) {
  const method = useMethod(methods);
  const size = useSize();
  const [tab] = useTab();
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.ctrlKey) return;
      switch (e.key) {
        case "0":
          selectMethod("cash", defVals);
          break;
        case "1":
          selectMethod("qris", defVals);
          break;
        case "2":
          selectMethod("transfer", defVals);
          break;
        case "3":
          selectMethod("debit", defVals);
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
          selectMethod(val, defVals);
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
            queue.add(() => tx.transaction.update.methodId(tab, num));
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
