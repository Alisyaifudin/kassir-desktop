import { Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { Kbd } from "~/components/ui/kdb";
import { showShortcut, useShortcut } from "./use-shortcut";
import { useSize } from "~/hooks/use-size";
import { Button } from "~/components/ui/button";

const iconSize = {
  big: 24,
  small: 20,
};

export function SettingLink() {
  const { pathname } = useLocation();
  const size = useSize();
  const show = useShortcut();
  const navigate = useNavigate();

  return (
    <div className="relative flex items-center">
      <Kbd className={cn("absolute -bottom-3 -left-2 z-10", { hidden: !show })}>alt+5</Kbd>
      <Button
        variant={pathname.includes("/setting") ? "secondary" : "ghost"}
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          navigate("/setting");
          showShortcut(false);
        }}
        className={cn(
          "rounded-full h-10 w-10 small:h-8 small:w-8 transition-all hover:bg-sky-400/50",
          pathname.includes("/setting") && "bg-white/80",
        )}
      >
        <Settings size={iconSize[size]} />
      </Button>
    </div>
  );
}
