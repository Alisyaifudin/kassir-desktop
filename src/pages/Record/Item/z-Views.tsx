import { cn } from "~/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { RecordFull } from "~/services/record";
import { Detail } from "./z-Detail";
import { Receipt } from "./z-Receipt";
import { useTab } from "./use-tab";

/** A record's two faces: the receipt it prints, and the ledger it came from. */
export function Views({ record, busy }: { record: RecordFull; busy: boolean }) {
  const [tab, setTab] = useTab();
  // Both faces fade together while the record re-reads, so the stale one is not
  // the one you act on.
  const stale = busy && "opacity-50 pointer-events-none";
  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      aria-busy={busy}
      className="flex flex-col gap-2 h-full overflow-hidden"
    >
      <div className="flex justify-between items-center gap-2 shrink-0">
        <TabsList className="h-fit">
          <TabsTrigger className="text-normal" value="detail">
            Detail
          </TabsTrigger>
          <TabsTrigger className="text-normal" value="receipt">
            Resi
          </TabsTrigger>
        </TabsList>
      </div>
      {/* Radix mounts only the active tab, so the receipt's own reads (shop
          identity, contacts) happen when someone looks at it, not on every open.
          The ledger manages its own scroll now — it has a band above and a shelf
          below that must not move — so this pane clips instead of scrolling. */}
      <TabsContent
        value="detail"
        className={cn("flex-1 min-h-0 overflow-hidden transition-opacity", stale)}
      >
        <Detail record={record} />
      </TabsContent>
      <TabsContent
        value="receipt"
        className={cn("flex-1 min-h-0 overflow-y-auto transition-opacity", stale)}
      >
        <Receipt record={record} />
      </TabsContent>
    </Tabs>
  );
}
