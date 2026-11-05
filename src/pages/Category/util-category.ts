import type { CategoryDuplicateName, CategoryError } from "~/services/category";

/**
 * The one sentence a category write can fail with.
 *
 * A taken name is the only failure the shop can fix, so it is worded as advice
 * rather than as an error; everything else falls back to the service's own
 * sentence. Kept in one place so the add dialog and the inline rename say the same
 * thing about the same constraint.
 */
export function categoryMessage(
  error: CategoryError | CategoryDuplicateName | null,
): string | null {
  if (error === null) return null;
  if (error._tag === "CategoryDuplicateName") {
    return `Kategori "${error.value}" sudah ada.`;
  }
  return error.message;
}
