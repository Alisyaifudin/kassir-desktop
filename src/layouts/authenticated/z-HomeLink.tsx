import { HomeIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

export function HomeLink() {
  return (
    <li className={cn("rounded-t-full flex items-center relative", "h-[60px] small:h-[35px]")}>
      <Link to="/" className="relative cursor-pointer">
        <HomeIcon className="small:w-[20px] small:h-[20px] w-[40px] h-[40px]" />
      </Link>
    </li>
  );
}
