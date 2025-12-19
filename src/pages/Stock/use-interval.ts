import { useLimit } from "./use-limit";
import { usePage } from "./use-page";

export function useInterval(productsLength: number) {
  const [limit] = useLimit();
  const [rawPage] = usePage();
  const totalItem = productsLength;
  const totalPage = Math.ceil(totalItem / limit);
  const page = rawPage > totalPage ? totalPage : rawPage;
  const start = limit * (page - 1);
  const end = limit * page;
  return { start, end, totalPage };
}
