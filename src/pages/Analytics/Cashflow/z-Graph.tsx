import { GraphUp } from "./z-GraphUp";
import { GraphDown } from "./z-GraphDown";

export function Graph({
  debts,
  labels,
  revenues,
  spendings,
}: {
  labels: string[];
  debts: { number: number; timestamp: number }[];
  revenues: { number: number; timestamp: number }[];
  spendings: { number: number; timestamp: number }[];
  interval: "week" | "month" | "year";
}) {
  return (
    <div className="flex flex-col flex-1 py-5">
      <GraphUp vals={revenues} />
      <div className="flex w-full h-[70px] small:h-[50px]">
        <div className="w-[80px] small:w-[60px]"></div>
        <div className="flex-1 flex gap-1">
          {labels.map((label) => (
            <div
              key={label}
              className="flex justify-center items-center"
              style={{ width: `${100 / (labels.length || 1)}%` }}
            >
              <p className="text-small! absolute">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <GraphDown debts={debts} vals={spendings} />
    </div>
  );
}
