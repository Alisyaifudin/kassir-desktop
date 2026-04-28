import { countUnsync } from "./get-count-unsync";
import { getUnsync } from "./get-events";
import { setEvents } from "./set-events";
import { updateSyncAt } from "./set-sync-at";
import { updateUnsyncAll } from "./update-unsync-all";

export const productEvent = {
  get: {
    unsync: getUnsync,
    countUnsync,
  },
  update: {
    unsyncAll: updateUnsyncAll,
    syncAt: updateSyncAt,
    sync: setEvents,
  },
};
