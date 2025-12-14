import { Database } from "~/database/old";
import { useFetch } from "./use-fetch";
import { useCallback } from "react";

// export const FETCH_METHODS = "fetch-method";

export function useFetchMethods(db: Database) {
  const fetch = useCallback(() => db.method.get.all(), []);
  return useFetch(fetch);
}
