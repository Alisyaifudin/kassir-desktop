import { Product } from "./Product";
import { Top } from "./Top";
import { Header } from "./Header";
import { Show } from "~/components/Show";
import { ForEach } from "~/components/ForEach";
import { SummaryBody } from "./Summary";
import { Footer } from "./Footer";
import { usePrint } from "./use-print";
import { TextError } from "~/components/TextError";
import { Data } from "../use-data";
import { Info, useInfo } from "./use-info";
import { Result } from "~/lib/result";
import { ErrorComponent } from "~/components/ErrorComponent";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";

export function Receipt({ data }: { data: Data }) {
  const res = useInfo();
  return Result.match(res, {
    onLoading() {
      return <LoadingReceipt />;
    },
    onError(error) {
      log.error(error.e);
      return <ErrorComponent>{error.e.message}</ErrorComponent>;
    },
    onSuccess(info) {
      return <Wrapper data={data} info={info} />;
    },
  });
}

function Wrapper({ data: { extras, products, record }, info }: { data: Data; info: Info }) {
  const [ref, print] = usePrint();
  if (products.length === 0 && extras.length === 0) {
    return <TextError>Kosong</TextError>;
  }
  const headers = info.header === "" ? [] : info.header.split("\n");
  const footers = info.footer === "" ? [] : info.footer.split("\n");
  const totalQty =
    products.length === 0 ? 0 : products.map((i) => i.qty).reduce((p, c) => c + p, 0);
  const totalProductTypes = products.length;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
      <Top ref={ref} print={print} mode={record.mode} isCredit={record.isCredit} />
      <div className="border pt-5">
        <div id="print-container" className="flex flex-col gap-2 px-2 pb-5">
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

function LoadingReceipt() {
  return (
    <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
      <Skeleton className="h-12 w-full" />
      <div className="border pt-5">
        <div className="flex flex-col gap-2 px-2 pb-5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <div className="h-px bg-border" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
          <div className="h-px bg-border" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
