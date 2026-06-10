import { createAtom } from "@xstate/store";
import type { LucideIcon } from "lucide-react";
import { Trash2, Box, ArrowRightLeft, CreditCard, ReceiptText } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────

export type EntityId = "grave" | "product" | "product-event" | "method" | "record";
export type Phase = "idle" | "syncing" | "aborted" | "complete" | "error";
export type EntityStatus = "waiting" | "syncing" | "done" | "error";

export interface EntityProgress {
  status: EntityStatus;
  pullDone: number;
  pullTotal: number;
  pushDone: number;
  pushTotal: number;
  error: string | null;
}

export interface SyncResult {
  grave: EntityProgress;
  product: EntityProgress;
  "product-event": EntityProgress;
  method: EntityProgress;
  record: EntityProgress;
}

export interface SyncState {
  phase: Phase;
  result: SyncResult;
  globalError: string | null;
  /** Which entity is currently active (for the minimal pill display) */
  activeEntity: { id: EntityId; label: string; icon: LucideIcon } | null;
}

export const ENTITY_CONFIG: { id: EntityId; label: string; icon: LucideIcon; order: number }[] = [
  { id: "grave", label: "Sampah", icon: Trash2, order: 1 },
  { id: "product", label: "Produk", icon: Box, order: 2 },
  { id: "product-event", label: "Produk Event", icon: ArrowRightLeft, order: 3 },
  { id: "method", label: "Metode", icon: CreditCard, order: 4 },
  { id: "record", label: "Riwayat", icon: ReceiptText, order: 5 },
];

function initialProgress(): EntityProgress {
  return { status: "waiting", pullDone: 0, pullTotal: 0, pushDone: 0, pushTotal: 0, error: null };
}

export function initialResult(): SyncResult {
  return {
    grave: initialProgress(),
    product: initialProgress(),
    "product-event": initialProgress(),
    method: initialProgress(),
    record: initialProgress(),
  };
}

export function initialSyncState(): SyncState {
  return {
    phase: "idle",
    result: initialResult(),
    globalError: null,
    activeEntity: null,
  };
}

// ── Atom ────────────────────────────────────────────────────────────────

export const syncAtom = createAtom(initialSyncState());

// ── Signal ──────────────────────────────────────────────────────────────

/** Shared abort signal for the running sync. Set to { aborted: true } to cancel. */
export const syncSignal: { aborted: boolean } = { aborted: false };
