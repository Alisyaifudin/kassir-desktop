import { HomeIcon } from "lucide-react";
import { Link } from "~/services/route/react";
import { cn } from "~/lib/utils";

export function HomeLink() {
  return (
    <li className={cn("rounded-t-full flex items-center relative", "h-11")}>
      {/* Home is where the app begins, so it is the stack's root. */}
      <Link to="/" behavior="root" className="relative cursor-pointer">
        <HomeIcon className="size-10" />
      </Link>
    </li>
  );
}
