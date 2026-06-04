import { addNewCashier } from "./add";
import { deleteCashierById } from "./del";
import { getAllCashier } from "./get-all";
import { getCashierById } from "./get-by-id";
import { updateCashierHash } from "./update-hash";
import { updateName } from "./update-name";
import { updateRole } from "./update-role";

export const cashier = {
  get: {
    all: getAllCashier,
    byId: getCashierById,
  },
  add: addNewCashier,
  update: {
    name: updateName,
    hash: updateCashierHash,
    role: updateRole,
  },
  delete: deleteCashierById,
};
