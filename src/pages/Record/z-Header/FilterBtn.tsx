import { Button } from "~/components/ui/button";
import { MethodFull } from "~/database-effect/method/get-all";
import { METHOD_NAMES } from "~/lib/constants";

export function FilterBtn({
  selected,
  onClick,
  options,
  top,
}: {
  onClick: (id: number) => void;
  selected: number | null;
  top: MethodFull;
  options: MethodFull[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={top.id === selected ? "default" : "outline"}
        className="w-fit p-1 px-3 font-bold"
        onClick={() => onClick(top.id)}
      >
        {METHOD_NAMES[top.kind]}
      </Button>
      <div className="flex items-center gap-3 flex-wrap">
        {options.map((m) => (
          <div key={m.id} className="flex gap-2 items-center pl-3">
            <Button
              variant={m.id === selected ? "default" : "outline"}
              className="w-fit p-1"
              onClick={() => onClick(m.id)}
            >
              {m.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
