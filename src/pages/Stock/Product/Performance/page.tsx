import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Panel } from "./Panel";
import { agg, getBins } from "./collect";
import { Graph } from "./Graph";

export default function Page() {
  const { histories, start, end, interval, mode, product } = useLoaderData<Loader>();
  const bins = getBins(interval, start, end);
  const data = agg(
    histories.filter((h) => h.mode === mode),
    bins
  );
  return (
    <div className="flex flex-col gap-1 flex-1">
      <Panel />
      <p className="text-bold">Nama: {product.name}</p>
      <Graph data={data} />
    </div>
  );
}
