import { Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { Kbd } from "~/components/ui/kdb";
import { Button } from "~/components/ui/button";

type Props = {
  useShowShortcut: () => boolean;
  hideShortcut: () => void;
};

export function SettingLink({ useShowShortcut, hideShortcut }: Props) {
  const { pathname } = useLocation();
  const show = useShowShortcut();
  const navigate = useNavigate();

  return (
    <div className="relative flex items-center">
      <Kbd className={cn("absolute -bottom-3 -left-2 z-10", { hidden: !show })}>alt+4</Kbd>
      <Button
        variant={pathname.includes("/setting") ? "secondary" : "ghost"}
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          navigate("/setting");
          hideShortcut();
        }}
        className={cn(
          "rounded-full h-10 w-10 small:h-8 small:w-8 transition-all hover:bg-sky-400/50",
          pathname.includes("/setting") && "bg-white/80",
        )}
      >
        <Settings className="small:w-5 small:h-5 w-6 h-6" />
      </Button>
    </div>
  );
}
