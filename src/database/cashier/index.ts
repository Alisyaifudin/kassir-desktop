import { add } from "./add";
import { del } from "./del";
import { all } from "./get-all";
import { byId } from "./get-by-id";
import { updateHash } from "./update-hash";
import { updateName } from "./update-name";
import { updateRole } from "./update-role";

export const cashier = {
  get: {
    all,
    byId,
  },
  add,
  update: {
    name: updateName,
    hash: updateHash,
    role: updateRole,
  },
  delete: del,
};
