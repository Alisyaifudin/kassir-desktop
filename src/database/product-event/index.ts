import { countUnsync } from "./get-count-unsync";
import { getEvents } from "./get-events";
import { setEvents } from "./set-events";
import { setSyncAt } from "./set-sync-at";

export const productEvent = {
  get: {
    unsync: getEvents,
    countUnsync,
  },
  set: {
    sync: setEvents,
    syncAt: setSyncAt,
  },
};
