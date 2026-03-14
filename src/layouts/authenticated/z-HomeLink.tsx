import { HomeIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { useSize } from "~/hooks/use-size";

const iconSize = {
  big: 40,
  small: 20,
};

export function HomeLink() {
  const size = useSize();
  return (
    <li className={cn("rounded-t-full flex items-center relative", "h-[60px] small:h-[35px]")}>
      <Link to="/" className="relative cursor-pointer">
        <HomeIcon size={iconSize[size]} />
      </Link>
    </li>
  );
}
