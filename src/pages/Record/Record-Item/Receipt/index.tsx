import { Item } from "./Item";
import { Size } from "~/lib/store-old";
import { Top } from "./Top";
import { Header } from "./Header";
import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { SummaryBody } from "./Summary";
import { Footer } from "./Footer";
import { usePrint } from "./use-print";
import { Summary } from "~/lib/record";
import { TextError } from "~/components/TextError";

export function Receipt({
  data: { additionals, items, record },
  info,
  socials,
  method,
}: {
  data: Summary;
  info: {
    size: Size;
    showCashier: boolean;
    owner: string;
    address: string;
    footer: string;
    header: string;
    newVersion: string;
  };
  socials: DB.Social[];
  method: DB.Method;
}) {
  const [ref, print] = usePrint();
  if (items.length === 0 && additionals.length === 0) {
    return <TextError>Kosong</TextError>;
  }
  const headers = info.header === undefined ? [] : info.header.split("\n");
  const footers = info.footer === undefined ? [] : info.footer.split("\n");
  const totalQty = items.length === 0 ? 0 : items.map((i) => i.qty).reduce((p, c) => c + p);
  const totalProductTypes = items.length;
  return (
    <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
      <Top ref={ref} print={print} mode={record.mode} credit={record.credit} />
      <div className="border pt-5">
        <div id="print-container" className="flex flex-col gap-2 px-2">
          <Header
            address={info.address ?? ""}
            cashier={record.cashier}
            headers={headers}
            owner={info.owner ?? ""}
            showCashier={info.showCashier}
            timestamp={record.timestamp}
          />
          <hr />
          <Show when={items.length > 0}>
            <ForEach items={items}>{(item) => <Item {...item} />}</ForEach>
            <hr />
          </Show>
          <SummaryBody additionals={additionals} itemsLength={items.length} record={record} />
          <Footer
            totalProductTypes={totalProductTypes}
            totalQty={totalQty}
            footers={footers}
            socials={socials}
            method={method}
            customer={{ name: record.customer_name, phone: record.customer_phone }}
          />
        </div>
      </div>
    </div>
  );
}
