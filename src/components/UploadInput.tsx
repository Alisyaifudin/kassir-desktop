import { Cloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { Effect, Either } from "effect";
import { InvalidShapeError, JsonError, TooBigError } from "~/lib/error-effect";
import { TextError } from "./TextError";
import { Spinner } from "./Spinner";

type Props<T> = {
  extract: (file: File) => Effect.Effect<T, JsonError | InvalidShapeError | TooBigError>;
  children: (data: T) => React.ReactNode;
};

export function UploadInput<T>({ children, extract }: Props<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ data: T; name: string } | null>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current -= 1;

    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";

    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const file = fileList.item(0);
    if (!file || !file.name.endsWith(".json")) {
      setData(null);
      return;
    }
    if (loading) return;
    setLoading(true);
    const either = await Effect.runPromise(extract(file).pipe(Effect.either));
    setLoading(false);
    Either.match(either, {
      onLeft({ e }) {
        console.error(e);
        setError(e.message);
      },
      onRight(data) {
        setData({ data, name: file.name });
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    setData(null);
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-input hover:border-primary hover:bg-accent/50",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        disabled={loading}
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      {data === null ? (
        <div className="flex flex-col items-center justify-center gap-3">
          {loading ? (
            <Spinner when className="w-8 h-8 text-primary" />
          ) : (
            <div
              className={cn(
                "p-3 rounded-full transition-colors",
                isDragActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Cloud className="w-8 h-8" />
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {loading
                ? "Memproses..."
                : isDragActive
                  ? "Jatuhkan berkas di sini"
                  : "Jatuhkan berkas di sini atau klik"}
            </p>
          </div>
          {error === null ? null : (
            <div className="text-center">
              <TextError>{error}</TextError>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 justify-between">
            <span>{data.name}</span>
            <Button onClick={removeFile} variant="destructive">
              <X />
            </Button>
          </div>
          {children(data.data)}
        </div>
      )}
    </div>
  );
}
