import { Button } from "~/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { Method } from "./z-Method";
import { Suspense } from "react";
import { Loading } from "~/components/Loading";
import { useTab } from "../../Right/Header/use-tab";
import { clear } from "./util-clear";
import { Form } from "./z-Form";

export function Summary() {
  const [tab] = useTab();
  return (
    <div className="flex flex-col p-2 h-fit gap-2">
      <div className="flex flex-col gap-2 flex-1 h-full items-center justify-between">
        <div className="flex items-center gap-1 justify-between w-full">
          <Button
            className="p-1 rounded-full"
            type="button"
            variant="destructive"
            onClick={() => {
              if (tab !== undefined) clear(tab);
            }}
          >
            <RefreshCcw className="icon" />
          </Button>
          <Suspense fallback={<Loading />}>
            <Method />
          </Suspense>
        </div>
      </div>
      <Form />
    </div>
  );
}
