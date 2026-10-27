import { Plus } from "lucide-react";

/**
 * The `+` at the end of the strip. A label around the input, so the tile itself is
 * clickable and the input stays reachable by keyboard; the strip around it accepts
 * a drop of picked files too.
 *
 * It is deliberately not a `Reorder.Item`: motion only tracks its own items, so a
 * plain row of the group is never a drag target.
 */
export function AddTile({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}) {
  return (
    <li className="h-32 aspect-square shrink-0 p-0.5">
      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <Plus className="size-5" />
        <span className="text-sm">Tambah</span>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files ?? []);
            // cleared so that picking the same file again still fires a change
            e.currentTarget.value = "";
            if (files.length > 0) onFiles(files);
          }}
        />
      </label>
    </li>
  );
}
