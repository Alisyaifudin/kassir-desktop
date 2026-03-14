import { useSearchParams } from "react-router";
import { getBackURL } from "~/lib/utils";

export function useBackUrl(defaultURL: string = "/") {
  const [search] = useSearchParams();
  return getBackURL(defaultURL, search);
}
