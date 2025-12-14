import { METHOD_BASE_ID, Result } from "~/lib/utils";
import { use, useEffect } from "react";
import { TextError } from "~/components/TextError";
import { Loading } from "~/components/Loading";
import { Method as MethodDB } from "~/database/method/get-all";
import { useStoreValue } from "@simplestack/store/react";
import { basicStore } from "../../use-transaction";
import { useSize } from "~/hooks/use-size";
import { tx } from "~/transaction";
import { queue } from "../../utils/queue";
import { useTab } from "../../use-tab";

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

function Wrapper({ methods }: { methods: MethodDB[] }) {
  const method = useMethod(methods);
  const size = useSize();
  const [tab] = useTab();
  if (method === undefined) return <Loading />;
  const suboption = methods.filter((m) => m.kind === method.kind && m.name !== undefined);
  return (
    <div className="flex items-center gap-3">
      <select
        style={selectWidth[size]}
        value={method.kind}
        onChange={(e) => {
          const val = e.currentTarget.value as DB.MethodEnum;
          basicStore.select("methodId").set(METHOD_BASE_ID[val]);
          queue.add(() => tx.transaction.update.methodId(tab, METHOD_BASE_ID[val]));
        }}
        className="outline"
      >
        <option value="cash">Tunai</option>
        <option value="transfer">Transfer</option>
        <option value="debit">Debit</option>
        <option value="qris">QRIS</option>
      </select>
      {suboption.length > 0 ? (
        <select
          style={selectWidth[size]}
          value={method.id}
          onChange={(e) => {
            const val = e.currentTarget.value;
            const num = Number(val);
            if (isNaN(num)) return;
            if (methods.find((m) => m.id === num) === undefined) return;
            basicStore.select("methodId").set(num);
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
  const methodId = useStoreValue(basicStore.select("methodId"));
  const find = methods.find((m) => m.id === methodId);
  useEffect(() => {
    if (find === undefined) {
      basicStore.select("methodId").set(METHOD_BASE_ID.cash);
    }
  }, [methodId]);
  return find;
}
