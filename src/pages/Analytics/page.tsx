import { Outlet } from "react-router";
import { cn } from "~/lib/utils";

export default function Analytics() {
  return (
    <main
      className={cn(
        "grid p-2 gap-2 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]",
        "grid-cols-[300px_1fr] small:grid-cols-[200px_1fr]",
      )}
    >
      <Outlet />
    </main>
  );
}
