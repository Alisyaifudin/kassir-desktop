import { get } from "./get";
import { setName } from "./set-name";
import { setWidth } from "./set-width";

export const printer = {
  get,
  set: {
    name: setName,
    width: setWidth,
  },
};
