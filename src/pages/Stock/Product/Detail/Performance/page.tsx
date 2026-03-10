import { Panel } from "./z-Panel";
import { agg, getBins } from "./util-collect";
import { Graph } from "./z-Graph";
import { useId } from "../use-id";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { LoadingBig } from "~/components/Loading";
import { log } from "~/lib/log";
import { ErrorComponent } from "~/components/ErrorComponent";
import { NotFound } from "~/components/NotFound";
import { ProductHistory } from "~/database-effect/product/get-history-range";
import { useBound } from "./use-bound";
import { useMemo } from "react";
import { useInterval } from "./use-interval";
import { useMode } from "./use-mode";

export default function Page() {
  const id = useId();
  const res = useData(id);
  return Result.match(res, {
    onLoading() {
      return <LoadingBig />;
    },
    onError(e) {
      switch (e._tag) {
        case "DbError":
          log.error(e.e);
          return <ErrorComponent>{e.e.message}</ErrorComponent>;
        case "NotFound":
          return <NotFound />;
      }
    },
    onSuccess([histories, product]) {
      return <Wrapper product={product} histories={histories} />;
    },
  });
}
function Wrapper({
  histories,
  product,
}: {
  histories: ProductHistory[];
  product: { name: string };
}) {
  const [startRaw, endRaw] = useBound();
  const [interval] = useInterval();
  const [mode] = useMode();
  const [start, end] = useMemo(() => {
    if (interval === "all") {
      const times = histories.map((h) => h.timestamp);
      const start = times.length > 0 ? Math.min(...times) : Date.now();
      const end = times.length > 0 ? Math.max(...times) : Date.now() + 1;
      return [start, end] as const;
    } else {
      return [startRaw, endRaw] as const;
    }
  }, [startRaw, endRaw, interval]);
  const bins = getBins(interval, start, end);
  const data = agg(
    histories.filter((h) => h.mode === mode),
    bins,
  );
  return (
    <div className="flex flex-col gap-1 flex-1">
      <Panel />
      <p className="text-bold">Nama: {product.name}</p>
      <Graph data={data} />
    </div>
  );
}
