import { useSearchParams } from "react-router";
import { z } from "zod";
import { useStream, type Result } from "~/components/Loader";
import { service } from "~/services";
import type { Method, MethodError } from "~/services/method";

export function useMethods(): Result<Method[], MethodError> {
  return useStream(service.method.get.changes);
}

/**
 * The `method` param, resolved against the catalog. Selecting the id that is
 * already selected clears the filter, so the button toggles.
 */
export function useMethod() {
  const [search, setSearch] = useSearchParams();
  const res = useMethods();
  const methods = res.type === "success" ? res.data : [];
  const methodId = z.string().nullable().catch(null).parse(search.get("method"));
  const method = methods.find((item) => item.id === methodId) ?? null;

  function setMethod(id: string | null) {
    setSearch((old) => {
      const next = new URLSearchParams(old);
      if (id === null || id === methodId) {
        next.delete("method");
      } else {
        next.set("method", id);
      }
      return next;
    });
  }

  return [method, setMethod] as const;
}
