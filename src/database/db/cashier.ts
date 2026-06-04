import { sqlx } from "../sqlx";

export const cashier = {
  get: {
    all: sqlx.cashier.get.all,
    byId: sqlx.cashier.get.byId,
  },
  add: sqlx.cashier.add,
  update: {
    name: sqlx.cashier.update.name,
    hash: sqlx.cashier.update.hash,
    role: sqlx.cashier.update.role,
  },
  delete: sqlx.cashier.delete,
};
