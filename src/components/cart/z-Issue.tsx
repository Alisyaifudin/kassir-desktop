import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import type { CodeIssue } from "./code-issues";

/** The text under a cell for a problem that blocks (red) or warns (amber). */
export function CodeIssueView({ issue }: { issue: CodeIssue }) {
  return (
    <div className="flex flex-col gap-0.5 text-small leading-tight select-none">
      {issue.messages.map((message, index) => (
        <span
          key={index}
          className={cn(
            "flex items-center gap-1",
            issue.tone === "error" ? "text-destructive" : "text-amber-600",
          )}
        >
          <span>{message.text}</span>
          {message.productIds?.map((productId) => (
            <Link
              key={productId}
              to={`/products/${productId}`}
              title="Buka produk"
              className="inline-flex shrink-0"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="icon" />
            </Link>
          ))}
        </span>
      ))}
    </div>
  );
}

/** A one-line hard error under a name/unit cell. */
export function FieldIssue({ children }: { children: string }) {
  return <span className="text-small leading-tight text-destructive select-none">{children}</span>;
}
