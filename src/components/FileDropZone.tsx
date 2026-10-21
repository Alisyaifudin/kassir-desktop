import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Cloud } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * A file picker you can drop onto, click, or reach with Tab + Enter.
 *
 * The three importers (Setting → Data product and record, Money → History) each
 * used to hand-draw this from a click-only `<div>` over an `className="hidden"`
 * input, so the whole flow was mouse-only and a screen reader saw nothing. Here
 * the input stays in the accessibility tree (`sr-only` rather than `hidden`),
 * carries a name, and the wrapper rings itself when the input has focus — so
 * Enter or Space on the focused zone opens the picker natively.
 */
export function FileDropZone({
  label,
  onFiles,
  accept = ".json",
}: {
  /** The zone's accessible name, e.g. "Pilih berkas produk". */
  label: string;
  onFiles: (files: FileList) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depthRef = useRef(0);
  const [active, setActive] = useState(false);

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    depthRef.current += 1;
    setActive(true);
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    depthRef.current -= 1;
    if (depthRef.current <= 0) {
      depthRef.current = 0;
      setActive(false);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (!active) setActive(true);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    depthRef.current = 0;
    setActive(false);
    onFiles(event.dataTransfer.files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    // Reset first, so picking the same file twice still fires a change.
    event.target.value = "";
    if (files !== null) onFiles(files);
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(event) => {
        // The input opens the picker itself when it is activated by the
        // keyboard; clicking the zone around it does the same for the mouse.
        if (event.target !== inputRef.current) inputRef.current?.click();
      }}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background",
        active
          ? "border-primary bg-primary/5"
          : "border-input hover:border-primary hover:bg-accent/50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={label}
        onChange={handleChange}
        className="sr-only"
      />

      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className={cn(
            "p-3 rounded-full transition-colors",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Cloud className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">
            {active ? "Jatuhkan berkas di sini" : "Jatuhkan berkas di sini atau klik"}
          </p>
        </div>
      </div>
    </div>
  );
}
