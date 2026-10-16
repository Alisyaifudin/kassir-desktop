import { ImageDialog } from "./z-ImageDialog";

export function ImageControl() {
  return (
    <div className="flex gap-2 w-full items-center justify-between">
      <p className="text-small text-muted-foreground">
        Tarik gambar untuk mengubah urutan. Gambar paling kiri menjadi sampul.
      </p>
      <ImageDialog />
    </div>
  );
}
