import { useSearchParams } from "react-router";
import { getURLBack } from "~/lib/utils";

export function useGetUrlBack(defaultURL: string = "/") {
  const [search] = useSearchParams();
  return getURLBack(defaultURL, search);
}
