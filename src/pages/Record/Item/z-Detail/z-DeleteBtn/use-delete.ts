import { Either } from "effect";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/** Soft-delete the record, then return to the page it was opened from. */
export function useDelete(id: string) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const backUrl = search.get("url_back") ?? "/records";
  const { pending, error, mutate } = useMutation(service.record.delete.byId);

  async function remove() {
    const result = await mutate(id);
    if (Either.isRight(result)) navigate(backUrl);
  }

  return { loading: pending, error: error?.message ?? null, remove };
}
