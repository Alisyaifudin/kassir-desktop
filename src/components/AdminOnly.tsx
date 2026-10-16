import Redirect from "~/components/Redirect";
import { useUser } from "~/hooks/use-user";

/**
 * Renders its children for admins and sends everyone else back to `fallback`.
 * Replaces the `admin` route middleware, whose module no longer exists.
 */
export function AdminOnly({
  children,
  fallback = "/setting",
}: {
  children: React.ReactNode;
  /** Where a non-admin is sent. Defaults to the Setting index. */
  fallback?: string;
}) {
  const role = useUser().role;
  if (role !== "admin") return <Redirect to={fallback} />;
  return <>{children}</>;
}
