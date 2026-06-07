import { sqlx } from "../sqlx";

export const cashier = {
  get: {
    all: sqlx.cashier.get.all,
    byId: sqlx.cashier.get.byId,
  },
  add: {
    new: sqlx.cashier.add.new,
  },
  update: {
    name: sqlx.cashier.update.name,
    hash: sqlx.cashier.update.hash,
    role: sqlx.cashier.update.role,
  },
  delete: {
    byId: sqlx.cashier.delete.byId,
  },
};
