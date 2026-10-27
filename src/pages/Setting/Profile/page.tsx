import { Name } from "./z-Name";
import { PasswordForm } from "./z-PasswordForm";
import { PageHeader } from "../z-PageHeader";
import { Panel } from "../z-Panel";
import { navItemOf } from "../util-nav";

const item = navItemOf("/setting/profile");

export default function Page() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6">
      <PageHeader title={item.label} description={item.description} />
      <Panel title="Nama">
        <Name />
      </Panel>
      <Panel title="Kata Sandi">
        <PasswordForm />
      </Panel>
    </div>
  );
}
