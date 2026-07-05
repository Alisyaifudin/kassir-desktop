import { CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { MoneyImport } from "~/services/money/type";
import { DuplicateError } from "~/lib/error-effect";
import { useUploadProgress } from "~/components/UploadProgress";
import { formatEpochtime } from "~/lib/date";
import { Button } from "~/components/ui/button";
import { Show } from "~/components/Show";
import { MoneyError } from "~/services/money/error";

type Props = {
  pocketId: string;
  data?: { name: string; money: MoneyImport[] };
  onRemove: () => void;
  onAddExternal: (
    pocketId: string,
    record: MoneyImport,
  ) => Promise<string | null>;
};

export function UploadSelected({
  pocketId,
  data,
  onRemove,
  onAddExternal,
}: Props) {
  return (
    <div className="space-y-3">
      <Show value={data}>
        {(data) => (
          <>
            <div className="flex items-center justify-between p-4 bg-card border border-input rounded-lg">
              <span className="font-medium text-foreground">{data.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <UploadedEntries
              pocketId={pocketId}
              items={data.money}
              onAddExternal={onAddExternal}
              onDone={onRemove}
            />
          </>
        )}
      </Show>
    </div>
  );
}

type MoneyUploadError = MoneyError | DuplicateError;

function UploadedEntries({
  pocketId,
  items,
  onAddExternal,
  onDone,
}: {
  pocketId: string;
  items: MoneyImport[];
  onAddExternal: (
    pocketId: string,
    record: MoneyImport,
  ) => Promise<string | null>;
  onDone: () => void;
}) {
  const progress = useUploadProgress({
    items,
    getId: (m) => String(m.timestamp),
    add: (m) => onAddExternal(pocketId, m),
    onDone,
  });

  if (items.length === 0) return null;

  const firstPendingIndex = progress.findIndex((p) => p.state === "pending");

  return (
    <div className="space-y-2">
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{
            width: `${
              (progress.filter((p) => p.state !== "pending").length /
                items.length) *
              100
            }%`,
          }}
        />
      </div>
      <p className="text-small text-muted-foreground">
        {progress.filter((p) => p.state !== "pending").length}/{items.length}{" "}
        data tersimpan
      </p>
      <ol className="mt-4 space-y-2 max-h-48 overflow-y-auto">
        {progress.map((item, i) => {
          if (item.state === "pending" && i !== firstPendingIndex) return null;
          return (
            <li
              key={item.item.timestamp}
              className="flex flex-col gap-1 text-small"
            >
              <div className="flex items-center gap-2">
                <span>{i + 1}.</span>
                {item.state === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : item.state === "error" ? (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <span>
                  {formatEpochtime(item.item.timestamp, {
                    date: "long",
                    time: "long",
                  })}
                </span>
              </div>
              {item.state === "error" && <ErrorComp error={item.error} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ErrorComp({ error }: { error: MoneyUploadError }) {
  switch (error._tag) {
    case "DuplicateError":
      return (
        <span className="text-amber-600 truncate">Sudah ada — dilewati</span>
      );
    case "MoneyError":
      return <span className="text-destructive truncate">{error.e.message}</span>;
  }
}
