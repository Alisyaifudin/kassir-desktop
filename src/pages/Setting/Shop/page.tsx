import { CashierCheckbox } from "./CashierCheckbox";
import { SelectSize } from "./SelectSize";
import { Info } from "./Info";
import { useLoaderData } from "react-router";
import { Loader } from "./loader";
import { Suspense, use } from "react";
import { DefaultError, Result } from "~/lib/utils";
import { Info as InfoData } from "~/store/info/get";
import { Loading } from "~/components/Loading";
import { TextError } from "~/components/TextError";

export default function Page() {
  const info = useLoaderData<Loader>();

  return (
    <div className="flex flex-col gap-2 flex-1 w-full overflow-auto pb-3">
      <Suspense fallback={<Loading />}>
        <Wrapper info={info} />
      </Suspense>
      <SelectSize />
    </div>
  );
}

function Wrapper({ info: promise }: { info: Promise<Result<DefaultError, InfoData>> }) {
  const [errMsg, info] = use(promise);
  if (errMsg) return <TextError>{errMsg}</TextError>;
  const { owner, address, header, footer, showCashier } = info;
  return (
    <>
      <Info owner={owner} address={address} header={header} footer={footer} />
      <CashierCheckbox showCashier={showCashier} />
    </>
  );
}
