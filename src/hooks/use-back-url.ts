import { useSearchParams } from "react-router";
import { getBackURL } from "~/lib/utils";

export function useBackUrl(defaultUrl: string) {
  const [search] = useSearchParams();
  const url = getBackURL(defaultUrl, search);
  return url;
}
