import { TestBtn } from "./z-TestBtn";
import { Settings } from "./z-Settings";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";

const item = navItemOf("/setting/printer");

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
      <PageHeader title={item.label} description={item.description} />
      <Panel title="Printer">
        <Settings />
        {/* The test print is an action on the configuration above it, so it sits in
            the same panel, under a hairline, instead of floating on the canvas. */}
        <div className="border-t pt-4">
          <TestBtn />
        </div>
      </Panel>
    </div>
  );
}
