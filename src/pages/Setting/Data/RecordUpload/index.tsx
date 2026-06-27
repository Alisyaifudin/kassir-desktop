import { useState, useRef } from "react";
import { Cloud } from "lucide-react";
import { cn } from "~/lib/utils";
import { Show } from "~/components/Show";
import { Loading } from "./z-Loading";
import { SchemaDialog } from "./z-Schema";
import { TextError } from "~/components/TextError";
import { Selected } from "./z-Selected";
import { extractRecord, MAXIMUM_SIZE, RecordImport } from "./util-validate-record";
import { Effect, Either } from "effect";
import { log } from "~/lib/log";

export function RecordUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ name: string; records: RecordImport[] } | undefined>(
    undefined,
  );
  const [isDragActive, setIsDragActive] = useState(false);

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
    if (!fileList) return;

    const nextFile = fileList.item(0);

    if (nextFile === null) return;
    setLoading(true);
    const either = await Effect.runPromise(Effect.either(extractRecord(nextFile)));
    setLoading(false);
    dragDepthRef.current = 0;
    setIsDragActive(false);
    Either.match(either, {
      onLeft(e) {
        switch (e._tag) {
          case "JsonError":
            log.error(e.e);
            setError(e.e.message);
            break;
          case "TooBigError":
            setError(`Berkas terlalu besar: ${e.size}B. Maksimum ${MAXIMUM_SIZE}B`);
        }
      },
      onRight(data) {
        setError("");
        setData(data);
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

  const removeFile = () => {
    dragDepthRef.current = 0;
    setIsDragActive(false);
    setData(undefined);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="text-normal font-bold">Riwayat</h3>
        <SchemaDialog />
      </div>
      <TextError>{error}</TextError>
      <Selected data={data} onRemove={removeFile} />
      <Show when={!loading && data === undefined} fallback={<Loading />}>
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
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-3">
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
            <div className="text-center">
              <p className="font-semibold text-foreground">
                {isDragActive ? "Jatuhkan berkas di sini" : "Jatuhkan berkas di sini atau klik"}
              </p>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
