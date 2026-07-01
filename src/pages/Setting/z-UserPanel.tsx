import { User } from "lucide-react";
import { NavLink } from "../z-NavLink";

export function UserPanel() {
  return (
    <ol className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-sm">
      <NavLink path="/setting/profile" icon={User}>
        Profil
      </NavLink>
    </ol>
  );
}
