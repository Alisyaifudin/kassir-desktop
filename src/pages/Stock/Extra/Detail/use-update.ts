import { Effect } from "effect";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "~/database";
import { log } from "~/lib/log";
import { createExtraOptions } from "../util-extra-options";
import { Extra } from "~/database/extra/cache";
import { useAppForm } from "../z-ExtraForm";
import { useGetUrlBack } from "~/hooks/use-get-url-back";

export function useUpdate(extra: Extra) {
  const [error, setError] = useState<null | string>(null);
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/stock?tab=extra");
  const options = useRef(
    createExtraOptions({
      onError(error) {
        setError(error);
      },
      onSuccess() {
        setError(null);
        navigate(backUrl);
      },
      extra,
      program: (p) => program({ ...p, id: extra.id }),
    }),
  );
  const form = useAppForm(options.current);
  return { form, error };
}

function program(extra: Extra) {
  return db.extra.update.one(extra).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
