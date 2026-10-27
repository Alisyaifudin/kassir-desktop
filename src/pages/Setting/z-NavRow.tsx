import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { NavItem } from "./util-nav";

/**
 * One settings destination. A row, not a card: the whole line is the target, so
 * the hit area survives a finger on the counter's touchscreen, and five of them
 * read as one list instead of five competing panels.
 *
 * The row acknowledges the pointer the way the rest of the app does — a tinted
 * ground plus the `active` blue on the glyph it leads to. No lift, no shadow, no
 * entrance animation: none of that says "this goes somewhere" and all of it
 * costs the eye a reason to stop.
 */
export function NavRow({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const to = `${item.path}?${new URLSearchParams({ url_back: pathname })}`;
  const Icon = item.icon;

  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-inset focus-visible:outline-none"
      >
        <span
          className="tone flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary"
          style={{ "--tone-hue": item.hue } as CSSProperties}
        >
          <Icon aria-hidden="true" className="size-6 text-[var(--tone)]" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-base font-medium">{item.label}</span>
          <span className="text-base text-muted-foreground">{item.description}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="ml-auto size-6 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-active"
        />
      </Link>
    </li>
  );
}
