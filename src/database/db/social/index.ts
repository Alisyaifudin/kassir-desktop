import { addNewSocial } from "./add";
import { cache } from "./cache";
import { deleteSocialById } from "./del-by-id";
import { deleteManySocialsSync } from "./del-many-sync";
import { getAllSocials } from "./get-all";
import { getAllUnsync, getAllUnsyncSocials } from "./get-all-unsync";
import { getSocialsUpdatedAt } from "./get-updated-at";
import { updateUnsyncAllSocials } from "./update-unsync-all";
import { updateManySocialsSyncAt } from "./update-many-sync-at";
import { updateSocial } from "./update";
import { upsertManySocials } from "./upsert-many";

export const social = {
  get: {
    all: getAllSocials,
    unsync: getAllUnsyncSocials,
    allUnsync: getAllUnsync,
    updatedAt: getSocialsUpdatedAt,
  },
  delete: {
    byId: deleteSocialById,
    sync: deleteManySocialsSync,
  },
  update: {
    one: updateSocial,
    unsync: updateUnsyncAllSocials,
  },
  add: {
    one: addNewSocial,
  },
  upsert: {
    many: upsertManySocials,
  },
  sync: {
    update: {
      many: {
        syncAt: updateManySocialsSyncAt,
      },
    },
  },
  revalidate: cache.revalidate,
};
