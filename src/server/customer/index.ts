import { getCustomersFromServer } from "./get";
import { postCustomersToServer } from "./post";

export const customer = {
  get: getCustomersFromServer,
  post: postCustomersToServer,
};
