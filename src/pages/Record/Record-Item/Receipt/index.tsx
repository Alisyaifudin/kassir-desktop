import { Product } from "./Product";
import { Top } from "./Top";
import { Header } from "./Header";
import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { SummaryBody } from "./Summary";
import { Footer } from "./Footer";
import { usePrint } from "./use-print";
import { TextError } from "~/components/TextError";
import { Data, Info } from "../loader";

export function Receipt({ data: { extras, products, record }, info }: { data: Data; info: Info }) {
  const [ref, print] = usePrint();
  if (products.length === 0 && extras.length === 0) {
    return <TextError>Kosong</TextError>;
  }
  const headers = info.header === undefined ? [] : info.header.split("\n");
  const footers = info.footer === undefined ? [] : info.footer.split("\n");
  const totalQty = products.length === 0 ? 0 : products.map((i) => i.qty).reduce((p, c) => c + p);
  const totalProductTypes = products.length;
  return (
    <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
      <Top ref={ref} print={print} mode={record.mode} isCredit={record.isCredit} />
      <div className="border pt-5">
        <div id="print-container" className="flex flex-col gap-2 px-2">
          <Header
            address={info.address}
            cashier={record.cashier}
            headers={headers}
            owner={info.owner}
            showCashier={info.showCashier}
            timestamp={record.timestamp}
          />
          <hr className="h-1 bg-transparent border-t-2 border-dashed border-black" />
          <Show when={products.length > 0}>
            <ForEach items={products}>{(item) => <Product {...item} />}</ForEach>
            <hr className="h-1 bg-transparent border-t-2 border-dashed border-black" />
          </Show>
          <SummaryBody extras={extras} record={record} productLength={products.length} />
          <Footer
            totalProductTypes={totalProductTypes}
            totalQty={totalQty}
            footers={footers}
            socials={info.socials}
            method={record.method}
            customer={record.customer}
          />
        </div>
      </div>
    </div>
  );
}
