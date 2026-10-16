import { memo } from "react";
import { Button } from "~/components/ui/button";
import { useMethod } from "./use-method";
import { DEFAULTABLE_KINDS, METHOD_NAMES } from "~/lib/constants";

export const TabLink = memo(function TabLink() {
  const [method, setMethod] = useMethod();
  return (
    <ol className="flex items-cente gap-1">
      {DEFAULTABLE_KINDS.map((m) => (
        <li key={m}>
          <Button onClick={() => setMethod(m)} variant={method === m ? "default" : "link"}>
            {METHOD_NAMES[m]}
          </Button>
        </li>
      ))}
    </ol>
  );
});
