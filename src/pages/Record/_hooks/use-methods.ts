import { useCallback } from "react";
import { Database } from "~/database";
import { useFetch } from "~/hooks/useFetch";

export function useFetchMethods(db: Database) {
  const fetch = useCallback(() => db.method.get.all(), []);
  return useFetch(fetch);
}