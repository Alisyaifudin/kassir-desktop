import Redirect from "~/components/Redirect";
import { useUser } from "~/hooks/use-user";

/**
 * Renders its children for admins and sends everyone else back to the Setting
 * index. Replaces the `admin` route middleware, whose module no longer exists.
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const role = useUser().role;
  if (role !== "admin") return <Redirect to="/setting" />;
  return <>{children}</>;
}
