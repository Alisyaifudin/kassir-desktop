import { Box, ReceiptText, Trash2 } from "lucide-react";
import { Form } from "./z-Form";
import { GraveSync } from "./z-Grave";
import { ProductSync } from "./z-Product";
import { RecordSync } from "./z-Record";
import { Show } from "~/components/Show";
import { Resync } from "./z-Resync";

const ITEMS = [
  { Syncer: ProductSync, icon: Box },
  { Syncer: RecordSync, icon: ReceiptText },
  { Syncer: GraveSync,   icon: Trash2 },
] as const;

export function Sync({ token }: { token?: string }) {
  return (
    <div className="rounded-2xl gap-4 border bg-card p-4 shadow-sm flex-1 flex flex-col">
      <Form token={token} />
      <Show value={token}>
        {(token) => (
          <ul className="flex flex-col divide-y rounded-xl border overflow-hidden">
            {ITEMS.map(({ Syncer, icon }, i) => (
              <Syncer key={i} token={token} icon={icon} />
            ))}
          </ul>
        )}
      </Show>
      <Resync />
    </div>
  );
}
