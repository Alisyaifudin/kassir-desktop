import { CashierCheckbox } from "./z-CashierCheckbox";
import { SelectSize } from "./z-SelectSize";
import { Info } from "./z-Info";
import { Suspense } from "react";
import { log } from "~/lib/utils";
import { Loading } from "~/components/Loading";
import { TextError } from "~/components/TextError";
import { useMicro } from "~/hooks/use-micro";
import { loader } from "./loader";
import { Either } from "effect";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 flex-1 w-full overflow-auto pb-3">
      <Suspense fallback={<Loading />}>
        <Wrapper />
      </Suspense>
      <SelectSize />
    </div>
  );
}

function Wrapper() {
  const res = useMicro({
    fn: () => loader(),
    key: "shop",
  });
  return Either.match(res, {
    onLeft(error) {
      const errMsg = error.e.message;
      log.error(JSON.stringify(error.e.stack));
      return <TextError>{errMsg}</TextError>;
    },
    onRight(info) {
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
