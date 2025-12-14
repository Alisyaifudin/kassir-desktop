import fuzzysort from "fuzzysort";
import { Extra } from "~/database/extra/caches";

export const useExtraSearch = () => {
  const search = (query: string, additionals: Extra[]) => {
    const filtered = fuzzysort.go(query, additionals, { key: "name" }).map((q) => q.obj);
    return filtered;
  };

  return search;
};
