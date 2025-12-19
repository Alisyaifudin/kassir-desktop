import { memo, useEffect, useState } from "react";
import { ForEach } from "~/components/ForEach";
import { log, METHOD_BASE_ID, METHOD_NAMES } from "~/lib/utils";
import { TextError } from "~/components/TextError";
import { Show } from "~/components/Show";
import { useLoading } from "~/hooks/use-loading";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";
import { useSubmit } from "react-router";
import { Method } from "~/database/method/get-all";

export const SelectMethod = memo(function ({
  method,
  methods,
  close,
}: {
  method: Method;
  methods: Method[];
  close: () => void;
}) {
  const option = methods.filter((m) => m.name === undefined);
  const suboption = methods.filter((m) => m.kind === method.kind && m.name !== undefined);
  const top = methods.find((m) => m.kind === method.kind && m.name === undefined);
  const [mount, setMount] = useState(false);
  const loading = useLoading();
  const submit = useSubmit();
  const actionData = useAction<Action>()("change-method");
  useEffect(() => {
    if (mount && actionData !== undefined && actionData.close && !loading) {
      close();
    }
    setMount(true);
  }, [actionData, loading]);
  if (top === undefined) {
    log.error("No top found?");
    return null;
  }
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const methodId = e.currentTarget.value;
    const formdata = new FormData();
    formdata.set("action", "change-method");
    formdata.set("method-id", methodId);
    submit(formdata, { method: "POST" });
  }
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-2">
      <div className="flex items-center gap-1">
        <p>Metode</p>
      </div>
      <div className="flex items-center gap-2">
        <span>:</span>
        <select
          value={METHOD_BASE_ID[method.kind]}
          className="w-fit outline"
          onChange={handleChange}
        >
          <ForEach items={option}>
            {(m) => <option value={m.id}>{METHOD_NAMES[m.kind]}</option>}
          </ForEach>
        </select>
        <Show when={suboption.length > 0}>
          <select value={method.id} className=" w-fit outline" onChange={handleChange}>
            <option value={top.id}>--Pilih--</option>
            <ForEach items={suboption}>{(m) => <option value={m.id}>{m.name}</option>}</ForEach>
          </select>
        </Show>
      </div>
      <TextError className="col-span-2">{actionData?.error}</TextError>
    </label>
  );
});
