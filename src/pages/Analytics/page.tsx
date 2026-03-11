import { Outlet } from "react-router";
import { cn } from "~/lib/utils";

export default function Analytics() {
  return (
    <main
      className={cn(
        "grid p-2 gap-2 flex-1 overflow-auto",
        "grid-cols-[300px_1fr] small:grid-cols-[200px_1fr]",
      )}
    >
      <Outlet />
    </main>
  );
}
