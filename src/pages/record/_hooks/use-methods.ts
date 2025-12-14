import { useCallback } from "react";
import { Database } from "~/database/old";
import { useFetch } from "~/hooks-old/use-fetch";

export function useFetchMethods(db: Database) {
  const fetch = useCallback(() => db.method.get.all(), []);
  return useFetch(fetch);
}
