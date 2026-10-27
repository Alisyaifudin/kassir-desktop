import { HomeIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

export function HomeLink() {
  return (
    <li className={cn("rounded-t-full flex items-center relative", "h-11")}>
      <Link to="/" className="relative cursor-pointer">
        <HomeIcon className="size-10" />
      </Link>
    </li>
  );
}
