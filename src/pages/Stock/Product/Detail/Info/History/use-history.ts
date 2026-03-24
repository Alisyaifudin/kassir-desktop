import { db } from "~/database";
import { Result } from "~/lib/result";
import { usePage } from "./use-page";
import { useMode } from "./use-mode";
import { Effect, pipe } from "effect";

const KEY = "product-history";
const LIMIT = 20;

export function useHistory(id: number) {
  const [page, setPage] = usePage();
  const [mode] = useMode();
  const res = Result.use({
    fn: () => loader({ id, page, mode, setPage }),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
    deps: [mode, page],
  });
  return res;
}

function loader({
  id,
  page,
  mode,
  setPage,
}: {
  id: number;
  page: number;
  mode: DB.Mode;
  setPage: (page: number) => void;
}) {
  return pipe(
    db.product.get.historyBefore(id, (page - 1) * LIMIT, LIMIT, mode),
    Effect.flatMap(({ histories, total }) => {
      const totalPage = Math.ceil(total / LIMIT);
      if (totalPage > 0 && page > totalPage) {
        setPage(1);
      }
      return Effect.succeed({ histories, total: totalPage });
    }),
  );
}
