import { useMemo } from "react";
import { Method } from "~/services/transaction/type";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Kbd } from "~/components/ui/kdb";
import { Show } from "~/components/Show";

export type PayInfo = {
  method: {
    id: string;
    kind: DBNamespace.MethodEnum;
  };
  value: number;
};

type Props = {
  methods: Method[];
  method: Method;
  value: number;
  onValueChange: (v: number) => void;
  onMethodChange: (v: Method) => void;
  withShortcut?: boolean;
};

const methodLabel = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
  debit: "Debit",
};

const methodKbd = {
  cash: "Ctrl+0",
  qris: "Ctrl+1",
  transfer: "Ctrl+2",
  debit: "Ctrl+3",
};

const methodKinds = ["cash", "transfer", "debit", "qris"] as const;

export function Pay({
  methods,
  method,
  onMethodChange,
  onValueChange,
  value,
  withShortcut = false,
}: Props) {
  const kindToLabeledMap = useMemo(() => {
    const map: Record<(typeof methodKinds)[number], Method[]> = {
      cash: [],
      qris: [],
      transfer: [],
      debit: [],
    };
    for (const m of methods) {
      if (m.label !== undefined) map[m.kind]!.push(m);
    }
    return map;
  }, [methods]);
  const subMethods = kindToLabeledMap[method.kind];
  return (
    <div className="flex items-center gap-1">
      <Select
        value={method.kind}
        onValueChange={(val) => {
          const kind = val as DBNamespace.MethodEnum;
          const matching = methods.find((m) => m.kind === kind);
          onMethodChange(matching ?? { id: "", kind });
        }}
      >
        <SelectTrigger className="max-w-[200px]">
          <SelectValue placeholder="Metode">
            {methodLabel[method.kind]}{" "}
            <Show when={withShortcut}>
              <Kbd>{methodKbd[method.kind]}</Kbd>
            </Show>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {methodKinds.map((kind) => (
              <SelectItem
                key={kind}
                kbd={
                  <Show when={withShortcut}>
                    <Kbd>{methodKbd[kind]}</Kbd>
                  </Show>
                }
                value={kind}
              >
                {methodLabel[kind]}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Show when={subMethods.length > 0}>
        <Select
          value={method.id}
          onValueChange={(val) => {
            const found = methods.find((m) => m.id === val);
            if (found) onMethodChange(found);
          }}
        >
          <SelectTrigger className="max-w-[180px]">
            <SelectValue placeholder="--Pilih--">{method.label ?? "--Pilih--"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {subMethods.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Show>

      <Input
        type="number"
        className="flex-1"
        value={value || ""}
        onChange={(e) => {
          const num = Number(e.currentTarget.value);
          if (isNaN(num) || !isFinite(num) || num < 0) return;
          onValueChange(num);
        }}
        placeholder="Jumlah bayar"
      />
    </div>
  );
}
