import { ForEach } from "~/components/ForEach";
import { Show } from "~/components/Show";
import { TextError } from "~/components/TextError";
import type { Info } from "~/services/info";
import type { RecordFull } from "~/services/record";
import type { Social } from "~/services/social";
import { usePrint } from "./use-print";
import { usePrintReceipt } from "./use-print-receipt";
import { Footer } from "./z-Footer";
import { Header } from "./z-Header";
import { Product } from "./z-Product";
import { Summary } from "./z-Summary";
import { Top } from "./z-Top";

export function Body({
  record,
  info,
  socials,
}: {
  record: RecordFull;
  info: Info;
  socials: Social[];
}) {
  const [printRef] = usePrint();
  const { loading, error, print } = usePrintReceipt(record);
  if (record.listings.length === 0 && record.extras.length === 0) {
    return <TextError>Kosong</TextError>;
  }

  const headers = info.header === "" ? [] : info.header.split("\n");
  const footers = info.footer === "" ? [] : info.footer.split("\n");
  const totalQty = record.listings.reduce((total, item) => total + item.qty, 0);

  return (
    <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
      <Top
        ref={printRef}
        record={record}
        loading={loading}
        error={error}
        print={() => void print()}
      />
      <div className="border pt-5">
        <div id="print-container" className="flex flex-col gap-2 px-2 pb-5">
          <Header
            paidAt={record.date}
            address={info.address}
            cashier={record.cashier}
            headers={headers}
            owner={info.owner}
            showCashier={info.showCashier}
            recordId={record.id}
          />
          <hr className="h-1 bg-transparent border-t-2 border-dashed border-black" />
          <Show when={record.listings.length > 0}>
            <ForEach items={record.listings}>
              {(item) => <Product key={item.id} product={item} fix={record.fix} />}
            </ForEach>
            <hr className="h-1 bg-transparent border-t-2 border-dashed border-black" />
          </Show>
          <Summary record={record} />
          <Footer
            totalProductTypes={record.listings.length}
            totalQty={totalQty}
            footers={footers}
            socials={socials}
            methods={record.isCredit ? [] : record.methods}
            customer={record.customer}
            supplier={record.supplier.name}
          />
        </div>
      </div>
    </div>
  );
}
