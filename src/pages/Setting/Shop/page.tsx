import { CashierCheckbox, CashierSkeleton } from "./z-CashierCheckbox";
import { Info, InfoSkeleton } from "./z-Info";
import { ReservedSkeleton } from "~/components/page-data";
import { TextError } from "~/components/TextError";
import { service } from "~/services";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";
import { pageData } from "./data";

const item = navItemOf("/setting/shop");

export default function Page() {
  return (
    <pageData.Provider sources={{ info: service.info.changes }}>
      <div className="flex w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
        <PageHeader title={item.label} description={item.description} />
        <Panel title="Identitas Toko">
          <Form />
        </Panel>
      </div>
    </pageData.Provider>
  );
}

/**
 * The panel head is static; inside it, every field label, the descriptions and
 * the save button are static too — only the values are pending. The skeleton
 * draws the same field rows (see `InfoSkeleton`), so the panel does not resize
 * when the shop's identity arrives.
 */
function Form() {
  return (
    <pageData.Gate
      keys={["info"]}
      // `delay={0}` + `ReservedSkeleton`: the form's shape is reserved from the
      // first frame (no shift) but not drawn for 200 ms (no flash).
      delay={0}
      pulse={
        <ReservedSkeleton className="flex flex-col gap-4">
          <InfoSkeleton />
          <CashierSkeleton />
        </ReservedSkeleton>
      }
      error={(error) => <TextError>{error.message}</TextError>}
    >
      {({ info }) => (
        <>
          <Info info={info} />
          <CashierCheckbox showCashier={info.showCashier} />
        </>
      )}
    </pageData.Gate>
  );
}
