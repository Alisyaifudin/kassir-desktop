import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useImageUrl } from "~/hooks/use-image";
import type { ProductImage } from "~/services/product";

export function Preview({
  image,
  canManage,
  hasPrev,
  hasNext,
  isCover,
  disabled,
  onPrev,
  onNext,
  onSetCover,
  onDelete,
}: {
  image: ProductImage | null;
  canManage: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  isCover: boolean;
  disabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSetCover: () => void;
  onDelete: () => void;
}) {
  const url = useImageUrl(image?.name ?? null, image?.mime ?? null);

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border bg-muted/20">
      {url !== null ? (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="absolute left-2 size-11 small:size-9"
        disabled={!hasPrev}
        onClick={onPrev}
        aria-label="Sebelumnya"
      >
        <ChevronLeft className="icon" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="absolute right-2 size-11 small:size-9"
        disabled={!hasNext}
        onClick={onNext}
        aria-label="Berikutnya"
      >
        <ChevronRight className="icon" />
      </Button>

      {canManage && image !== null ? (
        <div className="absolute right-2 top-2 flex gap-2">
          {!isCover ? (
            <Button
              type="button"
              variant="secondary"
              className="h-11 text-small small:h-9"
              disabled={disabled}
              onClick={onSetCover}
            >
              Jadikan cover
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            className="size-11 small:size-9"
            disabled={disabled}
            onClick={onDelete}
            aria-label="Hapus gambar"
          >
            <Trash2 className="icon" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
