import * as React from "react";

import { cn } from "../../lib/utils";
import { useSizeSafe } from "~/hooks/use-size";
import { style } from "~/lib/style";

const inputHeight: { big: React.CSSProperties; small: React.CSSProperties } = {
	big: {
		height: "56px",
	},
	small: {
		height: "36px",
	},
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, style: localStyle, type, ...props }, ref) => {
		const size = useSizeSafe() ?? "big";
		let styles = { ...style[size].text, ...inputHeight[size] };
		if (localStyle !== undefined) {
			styles = { ...styles, ...localStyle };
		}
		return (
			<input
				style={styles}
				type={type}
				className={cn(
					`flex w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-sm 
					transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground 
					placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring 
					disabled:cursor-not-allowed disabled:opacity-50`,
					className
				)}
				ref={ref}
				{...props}
			/>
		);
	}
);
Input.displayName = "Input";

export { Input };
