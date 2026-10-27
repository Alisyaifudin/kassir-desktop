import RecordDownload from "./RecordDownload";
import { ProductDownload } from "./ProductDownload";
import { RecordUpload } from "./RecordUpload";
import { PorductUpload } from "./ProductUpload";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";

const item = navItemOf("/setting/data");

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6">
      <PageHeader title={item.label} description={item.description} />
      <Panel title="Unduh Data">
        <ProductDownload />
        <RecordDownload />
      </Panel>
      <Panel title="Unggah Data">
        <PorductUpload />
        <RecordUpload />
      </Panel>
    </div>
  );
}
