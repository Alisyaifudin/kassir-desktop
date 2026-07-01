import { NewRecord } from "./z-NewRecord";
import { MoneyKind } from "~/database/money/get-by-range";
import { Name } from "./z-Name";

export function Header({ kind }: { kind: MoneyKind }) {
  return (
    <header className="flex items-center justify-between">
      <Name name={kind.name} kindId={kind.id} />
      <div className="flex items-center gap-3">
        <NewRecord kind={kind} />
      </div>
    </header>
  );
}
