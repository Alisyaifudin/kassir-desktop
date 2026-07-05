import { useLocation, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { Kbd } from "~/components/ui/kdb";

interface TopNavLinkProps {
  path: string;
  label: string;
  alt: string;
  root?: boolean;
  useShowShortcut: () => boolean;
  hideShortcut: () => void;
}

export function TopNavLink({ path, label, alt, root = false, useShowShortcut, hideShortcut }: TopNavLinkProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const show = useShowShortcut();
  const isActive = root ? pathname.startsWith(path) : pathname.includes(path);

  return (
    <div className="relative flex items-end h-full">
      <Kbd className={cn("absolute -top-1 -left-1 z-30", { hidden: !show })}>{alt}</Kbd>
      <button
        onClick={() => {
          const search = new URLSearchParams();
          search.set("url_back", "/");
          navigate(`${path}?${search.toString()}`);
          hideShortcut();
        }}
        className={cn(
          "px-4 h-[56px] small:h-[44px] font-bold transition-all flex items-center justify-center text-3xl small:text-2xl",
          "rounded-t-2xl border-x border-t border-transparent relative",
          isActive
            ? "bg-white text-primary border-black/10 -mb-[1px] z-10"
            : "text-primary/70 hover:bg-sky-400/30 hover:text-primary",
        )}
      >
        {label}
      </button>
    </div>
  );
}
