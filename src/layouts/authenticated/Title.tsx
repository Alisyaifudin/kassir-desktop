import { DefaultError, Result } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { use } from "react";

export function Title({ children }: { children: Promise<Result<DefaultError, string>> }) {
  const size = useSize();
  const [errMsg, title] = use(children);
  if (errMsg) return <p>Error</p>;
  return (
    <div className={css.title[size].div}>
      <p className={css.title[size].p}>{title}</p>
    </div>
  );
}
