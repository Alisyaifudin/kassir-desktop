import { useLimit } from "./use-limit";

export function Limit() {
  const [limit, setLimit] = useLimit();
  return (
    <div className="relative pt-4 pb-1">
      <span className="absolute -top-2 left-0 text-small z-10 px-1 bg-white">Batas</span>
      <select
        value={limit}
        className="w-fit text-normal outline"
        onChange={(e) => setLimit(Number(e.currentTarget.value))}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  );
}
