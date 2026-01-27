import { Name } from "./z-Name";
import { PasswordForm } from "./z-PasswordForm";

export default function Page() {
  return (
    <div className="flex flex-col gap-2 p-5 flex-1 text-3xl justify-between">
      <Name />
      <PasswordForm />
    </div>
  );
}
