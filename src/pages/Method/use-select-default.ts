import { Either } from "effect";
import { toast } from "sonner";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";
import type { DefaultableKind } from "~/lib/constants";

/**
 * Toggles a kind's default method. Clicking the one already marked clears the
 * default rather than leaving it stuck, which is what the legacy radio did.
 */
export function useSelectDefault({
  kind,
  id,
  defVal,
}: {
  kind: DefaultableKind;
  id: string;
  defVal?: string;
}) {
  const { mutate } = useMutation((next: string | null) => service.method.set.default(kind, next));

  async function handleClick() {
    const result = await mutate(id === defVal ? null : id);
    if (Either.isLeft(result)) toast.error(result.left.message);
  }

  return handleClick;
}
