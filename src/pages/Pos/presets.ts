/**
 * The extra names the Pos extras search offers. A preset only seeds a new
 * extra's name and kind; the cashier fills the value in.
 */
import type { ExtraPreset } from "~/components/cart/types";

export const EXTRA_PRESETS: ExtraPreset[] = [
  { id: "P1", name: "Ongkos Kirim", kind: "number", value: 0 },
  { id: "P2", name: "Biaya Packing", kind: "number", value: 0 },
  { id: "P3", name: "Biaya Kartu", kind: "percent", value: 0 },
  { id: "P4", name: "Biaya Layanan", kind: "percent", value: 0 },
  { id: "P5", name: "Diskon Grosir", kind: "percent", value: 0 },
  { id: "P6", name: "Diskon Kuantitas", kind: "percent", value: 0 },
  { id: "P7", name: "Pembulatan", kind: "number", value: 0 },
  { id: "P8", name: "Biaya Antar", kind: "number", value: 0 },
];
