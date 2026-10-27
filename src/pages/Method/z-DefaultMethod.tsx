import type { DefaultableKind } from "~/lib/constants";
import { useSelectDefault } from "./use-select-default";

export function DefaultMethod({
  kind,
  id,
  defVal,
}: {
  kind: DefaultableKind;
  id: string;
  defVal?: string;
}) {
  const handleClick = useSelectDefault({ kind, id, defVal });
  return (
    <input
      type="radio"
      name={kind}
      className="w-8"
      onClick={handleClick}
      onChange={() => {}}
      checked={id === defVal}
    />
  );
}
