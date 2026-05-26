import { Effect } from "effect";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "~/database";
import { log } from "~/lib/log";
import { createExtraOptions } from "../util-extra-options";
import { useAppForm } from "../z-ExtraForm";
import { useGetUrlBack } from "~/hooks/use-get-url-back";

export function useSubmit() {
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
      program,
    }),
  );
  const form = useAppForm(options.current);
  return { error, form };
}

type Input = {
  name: string;
  value: number;
  kind: DB.ValueKind;
};

function program(extra: Input) {
  return db.extra.add.one(extra).pipe(
    Effect.as(null),
    Effect.catchTag("DbError", ({ e }) => {
      log.error(e);
      return Effect.succeed(e.message);
    }),
  );
}
