import { useMemo } from "react";
import { service } from "~/services";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";
import { pageData, printersSource } from "./data";
import { PrinterWidth } from "./z-PrinterWidth";
import { SelectPrinter } from "./z-SelectPrinter";
import { TestBtn } from "./z-TestBtn";

const item = navItemOf("/setting/printer");

/**
 * The head, the panel and the test button are static; the two controls are the
 * only things that wait, and they wait on different keys — the width does not
 * need the system's printer list at all.
 */
export default function Page() {
  const sources = useMemo(
    () => ({ printer: service.printer.changes, printers: printersSource }),
    [],
  );

  return (
    <pageData.Provider sources={sources}>
      <div className="flex w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
        <PageHeader title={item.label} description={item.description} />
        <Panel title="Printer">
          <SelectPrinter />
          <PrinterWidth />
          {/* The test print is an action on the configuration above it, so it sits
              in the same panel, under a hairline, instead of floating on the
              canvas — and it needs neither key to be readable. */}
          <div className="border-t pt-4">
            <TestBtn />
          </div>
        </Panel>
      </div>
    </pageData.Provider>
  );
}
