import { Button } from "~/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { Method } from "./z-Method";
import { Form } from "./z-Form";
import { resetStore } from "../../use-transaction";
import { useTab } from "../../use-tab";

export function Summary() {
  const [tab] = useTab();
  return (
    <div style={{ flex: "0 0 auto" }}>
      <hr />
      <div className="flex flex-col p-2 h-fit gap-2">
        <div className="flex flex-col gap-2 flex-1 h-full items-center justify-between">
          <div className="flex items-center gap-1 justify-between w-full">
            <Button
              className="p-1 rounded-full"
              type="button"
              variant="destructive"
              onClick={() => {
                resetStore(tab);
              }}
            >
              <RefreshCcw className="icon" />
            </Button>
            <Method />
          </div>
        </div>
        <Form />
      </div>
    </div>
  );
}
