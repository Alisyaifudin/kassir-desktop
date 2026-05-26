import { Kind, useClicked } from "./use-select-default";

export function DefaultMethod({ kind, id, defVal }: { kind: Kind; id: string; defVal?: string }) {
  const handleClick = useClicked({ kind, id, defVal });
  return (
    <input
      type="radio"
      name={kind}
      className="w-8 small:w-5"
      onClick={handleClick}
      onChange={() => {}}
      checked={id === defVal}
    />
  );
}
