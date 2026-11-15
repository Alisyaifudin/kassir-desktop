import type { ImageOptStage } from "~/lib/image-opt";

/**
 * The one word for each phase the Rust side reports.
 *
 * The keywords come over IPC; the sentences live here, beside the two panels that
 * render them, the same split the sync phases and the backup stages use. `verify`
 * belongs to the integrity pass, which has its own panel — the map is shared whole
 * so a new stage is a type error in one place instead of a missing label in two.
 */
export const STAGE_LABEL: Record<ImageOptStage, string> = {
  scan: "Memeriksa gambar",
  convert: "Mengubah dan menggabungkan",
  sweep: "Membereskan berkas tak terpakai",
  verify: "Menghitung ulang isi gambar",
};
