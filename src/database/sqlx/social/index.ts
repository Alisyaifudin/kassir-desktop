import { addNewSocial } from "./add";
import { deleteSocialById } from "./del-by-id";
import { deleteManySocialsSync } from "./del-many-sync";
import { getAllSocials } from "./get-all";
import { getAllUnsyncSocials } from "./get-all-unsync";
import { updateUnsyncAllSocials } from "./update-unsync-all";
import { updateSocial } from "./update";
import { upsertManySocials } from "./upsert-many";

export const social = {
  get: {
    all: getAllSocials,
    unsync: getAllUnsyncSocials,
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
};
