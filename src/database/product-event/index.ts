import { getEvents } from "./get-events";
import { setEvents } from "./set-events";

export const productEvent = {
  get: {
    unsync: getEvents,
  },
  set: {
    sync: setEvents,
  },
};
