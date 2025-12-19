import { TextError } from "~/components/TextError";
import { memo, useCallback, useEffect, useState } from "react";
import { useLoading } from "~/hooks/use-loading";
import { useSubmit } from "react-router";
import { useAction } from "~/hooks/use-action";
import { Action } from "../action";

export const SelectMode = memo(function ({ close, mode }: { mode: DB.Mode; close: () => void }) {
  const loading = useLoading();
  const submit = useSubmit();
  const [mount, setMount] = useState(false);
  const actionData = useAction<Action>()("change-mode");
  useEffect(() => {
    if (mount && actionData !== undefined && actionData.close && !loading) {
      close();
    }
    setMount(true);
  }, [actionData, loading]);
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const mode = e.currentTarget.value;
      const formdata = new FormData();
      formdata.set("action", "change-mode");
      formdata.set("mode", mode);
      submit(formdata, { method: "POST" });
    },
    [mode]
  );
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-2">
      <span>Mode</span>
      <div className="flex gap-2">
        <span>:</span>
        <select value={mode} onChange={handleChange} className="w-fit outline">
          <option value="sell">Jual</option>
          <option value="buy">Beli</option>
        </select>
        <TextError>{actionData?.error}</TextError>
      </div>
    </label>
  );
});
