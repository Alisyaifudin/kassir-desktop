import type { Pocket } from "~/services/money";
import { NewRecord } from "./z-NewRecord";
import { Name } from "./z-Name";
import { TimePicker } from "./z-TimePicker";

export function Header({ pocket }: { pocket: Pocket }) {
  return (
    <header className="flex items-center justify-between">
      <Name name={pocket.name} pocketId={pocket.id} />
      <div className="flex items-center gap-3">
        <TimePicker />
        <NewRecord pocket={pocket} />
      </div>
    </header>
  );
}
