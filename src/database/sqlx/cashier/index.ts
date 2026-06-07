import { addNewCashier } from "./add-new";
import { deleteCashierById } from "./del-by-id";
import { getAllCashiers } from "./get-all";
import { getCashierById } from "./get-by-id";
import { updateCashierHash } from "./update-hash";
import { updateCashierName } from "./update-name";
import { updateCashierRole } from "./update-role";

export const cashier = {
  get: {
    all: getAllCashiers,
    byId: getCashierById,
  },
  add: {
    new: addNewCashier,
  },
  update: {
    name: updateCashierName,
    hash: updateCashierHash,
    role: updateCashierRole,
  },
  delete: {
    byId: deleteCashierById,
  },
};
