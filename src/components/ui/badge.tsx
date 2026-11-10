import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-primary/10 text-primary",
				outline: "border-input text-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/**
 * A short label attached to something else — a picked category, a state.
 *
 * `secondary` is the quiet one used for a value the reader can remove: a filled
 * primary badge next to a filter button would read as part of the button itself.
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant, ...props }, ref) => (
		<span ref={ref} className={cn(badgeVariants({ variant, className }))} {...props} />
	)
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
