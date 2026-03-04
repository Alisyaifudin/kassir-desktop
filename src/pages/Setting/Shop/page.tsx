import { CashierCheckbox } from "./z-CashierCheckbox";
import { SelectSize } from "./z-SelectSize";
import { Info } from "./z-Info";
import { LoadingFull } from "~/components/Loading";
import { TextError } from "~/components/TextError";
import { useData } from "./use-data";
import { Result } from "~/lib/result";
import { log } from "~/lib/log";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 w-full overflow-auto pb-3">
      <Wrapper />
      <SelectSize />
    </div>
  );
}

function Wrapper() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <LoadingFull />;
    },
    onError({ e }) {
      log.error(e);
      return <TextError>{e.message}</TextError>;
    },
    onSuccess(info) {
      const { owner, address, header, footer, showCashier } = info;
      return (
        <>
          <Info owner={owner} address={address} header={header} footer={footer} />
          <CashierCheckbox showCashier={showCashier} />
        </>
      );
    },
  });
}
