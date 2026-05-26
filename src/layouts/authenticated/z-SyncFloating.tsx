import { useAtom } from "@xstate/store/react";
import { useState, useEffect, useCallback } from "react";
import { X, ChevronUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { Progress, ProgressIndeterminate } from "~/components/ui/progress";
import { syncAtom, ENTITY_CONFIG, type EntityProgress, type SyncResult } from "~/lib/sync/atom";
import { abortSync } from "~/lib/sync/program";

const AUTO_DISMISS_MS = 5000;

export function SyncFloating() {
  const state = useAtom(syncAtom);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  const { phase, activeEntity, result, globalError } = state;

  // Show/hide based on phase
  useEffect(() => {
    if (phase === "syncing") {
      setVisible(true);
    } else if (phase === "complete" || phase === "aborted") {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setExpanded(false);
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    } else if (phase === "error") {
      setVisible(true);
    } else {
      setVisible(false);
      setExpanded(false);
    }
  }, [phase]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setExpanded(false);
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Overlay — only when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Card */}
      <div
        className={`fixed bottom-4 right-4 z-50 bg-card border rounded-2xl shadow-lg transition-all duration-200 ${
          expanded ? "w-[420px] p-4" : "p-3 cursor-pointer hover:shadow-xl"
        }`}
        onClick={() => !expanded && setExpanded(true)}
      >
        {expanded ? (
          <ExpandedPanel
            phase={phase}
            result={result}
            globalError={globalError}
            onClose={() => setExpanded(false)}
            onDismiss={handleDismiss}
          />
        ) : (
          <MinimalPill phase={phase} activeEntity={activeEntity} />
        )}
      </div>
    </>
  );
}

// ── Minimal Pill ─────────────────────────────────────────────────────────

function MinimalPill({
  phase,
  activeEntity,
}: {
  phase: string;
  activeEntity: { id: string; label: string; icon: React.ComponentType<{ className?: string }> } | null;
}) {
  if (phase === "syncing" && activeEntity) {
    const Icon = activeEntity.icon;
    return (
      <div className="flex items-center gap-2 text-normal">
        <Spinner when />
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-medium">{activeEntity.label}</span>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="flex items-center gap-2 text-normal text-emerald-600">
        <span>✓</span>
        <span className="font-medium">Sinkronisasi selesai</span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex items-center gap-2 text-normal text-destructive">
        <span>✗</span>
        <span className="font-medium">Sinkronisasi gagal</span>
      </div>
    );
  }

  if (phase === "aborted") {
    return (
      <div className="flex items-center gap-2 text-normal text-muted-foreground">
        <span>◼</span>
        <span className="font-medium">Sinkronisasi dibatalkan</span>
      </div>
    );
  }

  return null;
}

// ── Expanded Panel ───────────────────────────────────────────────────────

function ExpandedPanel({
  phase,
  result,
  globalError,
  onClose,
  onDismiss,
}: {
  phase: string;
  result: SyncResult;
  globalError: string | null;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const isRunning = phase === "syncing";

  return (
    <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-normal font-bold">
          {isRunning ? "Sinkronisasi..." : phase === "complete" ? "Selesai" : phase === "error" ? "Gagal" : "Dibatalkan"}
        </h3>
        <div className="flex items-center gap-1">
          {isRunning && (
            <Button size="sm" variant="outline" onClick={abortSync}>
              Batalkan
            </Button>
          )}
          <Button size="icon" variant="ghost" className="size-8" onClick={onClose}>
            <ChevronUp className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={onDismiss}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {globalError && (
        <div className="text-small text-destructive bg-destructive/10 rounded-lg p-2">
          {globalError}
        </div>
      )}

      {/* Entity rows */}
      <ul className="flex flex-col divide-y rounded-lg border overflow-hidden">
        {Object.entries(result).map(([key, prog]) => {
          const entityId = key as keyof typeof result;
          const cfg = ENTITY_CONFIG.find((e) => e.id === entityId);
          if (!cfg) return null;
          return (
            <ExpandedRow key={key} label={cfg.label} icon={cfg.icon} progress={prog} />
          );
        })}
      </ul>
    </div>
  );
}

function ExpandedRow({
  label,
  icon: Icon,
  progress,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: EntityProgress;
}) {
  const { status, pullDone, pullTotal, pushDone, pushTotal, error } = progress;

  const statusContent = () => {
    switch (status) {
      case "waiting":
        return <span className="text-muted-foreground text-small">Menunggu...</span>;
      case "syncing":
        return (
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <PullBar done={pullDone} total={pullTotal} />
            <PushBar done={pushDone} total={pushTotal} />
          </div>
        );
      case "done":
        return (
          <span className="text-small text-emerald-600 font-medium">
            ✓ Unduh {pullDone}, Unggah {pushTotal}
          </span>
        );
      case "error":
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-small text-destructive font-medium">✗ Gagal</span>
            {error && <span className="text-muted-foreground text-small">{error}</span>}
          </div>
        );
    }
  };

  return (
    <li className="flex items-start gap-2 px-3 py-2">
      <Icon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-small font-medium w-24 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{statusContent()}</div>
    </li>
  );
}

// ── Mini Bars ────────────────────────────────────────────────────────────

function PullBar({ done, total }: { done: number; total: number }) {
  const hasTotal = total > 0;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-small w-10 shrink-0">Unduh</span>
      <div className="flex-1 min-w-0">
        {hasTotal ? <Progress value={done} max={total} /> : <ProgressIndeterminate />}
      </div>
      <span className="text-muted-foreground text-small w-16 shrink-0 text-right tabular-nums">
        {hasTotal ? `${done}/${total}` : "..."}
      </span>
    </div>
  );
}

function PushBar({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-small w-10 shrink-0">Unggah</span>
      <div className="flex-1 min-w-0">
        {total > 0 ? (
          <Progress value={done} max={total} />
        ) : (
          <div className="h-1.5 w-full rounded-full bg-muted/50" />
        )}
      </div>
      <span className="text-muted-foreground text-small w-16 shrink-0 text-right tabular-nums">
        {total > 0 ? `${done}/${total}` : "..."}
      </span>
    </div>
  );
}
