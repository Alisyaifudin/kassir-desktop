import { getMethodsFromServer } from "./get";
import { postMethodsToServer } from "./post";

export const method = {
  get: getMethodsFromServer,
  post: postMethodsToServer,
};
