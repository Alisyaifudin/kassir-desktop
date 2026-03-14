import { useRange } from "./use-range";
import { DateRange } from "~/components/DateRange";

export function Header() {
  const [range, setRange] = useRange();
  return (
    <header className="flex items-center justify-between">
      <h1 className="font-bold text-big">Pencarian Komprehensif</h1>
      <div className="flex items-center gap-3">
        <p>Rentang:</p>
        <DateRange range={range} setRange={setRange} />
      </div>
    </header>
  );
}
