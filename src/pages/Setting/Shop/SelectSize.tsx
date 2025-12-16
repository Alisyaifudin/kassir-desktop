import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { toast } from "sonner";
import { useActionData, useNavigation, useSubmit } from "react-router";
import { Action } from "./action";
import { useSize } from "~/hooks/use-size";

export function SelectSize() {
  const [loading, handleChange] = useHandleSubmit();
  const error = useAction();
  const size = useSize();
  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name="action" value="size"></input>
      <label className="font-semibold text-normal">Ukuran</label>
      <select
        value={size}
        className="p-1 outline text-normal"
        onChange={(e) => handleChange(e.currentTarget.value)}
      >
        <option value="small">Kecil</option>
        <option value="big">Besar</option>
      </select>
      <Spinner when={loading} />
      <TextError>{error}</TextError>
    </div>
  );
}

export function useHandleSubmit() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const handleChangeSize = async (e: string) => {
    if (e !== "big" && e !== "small") {
      toast.error("Pilihan tidak valid");
      return;
    }
    const formdata = new FormData();
    formdata.set("action", "size");
    formdata.set("size", e);
    submit(formdata, { method: "POST" });
  };
  return [loading, handleChangeSize] as const;
}

function useAction() {
  const action = useActionData<Action>();
  if (action === undefined || action.action !== "size") return undefined;
  return action.error;
}
