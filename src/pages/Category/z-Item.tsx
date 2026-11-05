import { TextError } from "~/components/TextError";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/Spinner";
import { memo } from "react";
import equal from "fast-deep-equal";
import type { Category } from "~/services/category";
import { DeleteBtn } from "./z-DeleteBtn";
import { useRename } from "./use-rename";

/**
 * One category row. The name is the field: editing it in place and pressing Enter
 * is the rename, which is the only thing about a category that can change.
 */
export const Item = memo(function Item({ category }: { category: Category }) {
  const { handleSubmit, error, loading, name } = useRename(category.id, category.name);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 p-0.5 w-full">
        <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full">
          <Input
            className="w-full"
            name="name"
            value={name.value}
            onChange={(e) => name.set(e.currentTarget.value)}
            aria-autocomplete="list"
          />
          <Spinner when={loading} />
        </form>
        <DeleteBtn name={category.name} id={category.id} />
      </div>
      <TextError>{error}</TextError>
    </div>
  );
}, equal);
