import { useMemo } from "react";
import { PageHeader } from "../z-PageHeader";
import { navItemOf } from "../util-nav";
import { pageData, planSource } from "./data";
import { Run } from "./z-Run";
import { Usage } from "./z-Usage";

const item = navItemOf("/setting/image");

/**
 * The screen: what is on disk, then the one action that changes it.
 *
 * The head, both panel frames and every label are static, and they are drawn
 * before any read answers. The numbers arrive through `page-data` inside the
 * panels; the run is a write, not a key, so it cannot blank the page it reports
 * into.
 */
export default function Page() {
  const sources = useMemo(() => ({ plan: planSource }), []);

  return (
    <pageData.Provider sources={sources}>
      <div className="flex w-full flex-col gap-6 px-6 py-6">
        <PageHeader title={item.label} description={item.description} />
        <Usage />
        <Run />
      </div>
    </pageData.Provider>
  );
}
