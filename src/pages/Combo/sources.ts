import { service } from "~/services";

export function comboSources() {
  return {
    combos: service.combo.get.changes,
    listings: service.listing.get.changes,
    extras: service.extra.get.changes,
  };
}
