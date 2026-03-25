import { useMoney } from "./use-money";
import { NavCard } from "./z-NavCard";

export default function Page() {
  const money = useMoney();
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {money.map((m) => (
        <NavCard key={m.name} {...m} />
      ))}
    </div>
  );
}
