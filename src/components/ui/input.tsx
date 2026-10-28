import * as React from "react";

import { cn } from "../../lib/utils";
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				// Edge (the WebView2 the app ships in) pops its own suggestion box over a
				// text field as you type, and `autocomplete="off"` does not stop it. A
				// textbox that declares `aria-autocomplete` is treated as one that owns
				// its suggestions, so it leaves the field alone. Harmless elsewhere, and a
				// caller that really has a listbox (the Combobox) still passes its own.
				aria-autocomplete="list"
				className={cn(
					`flex h-9 w-full text-base rounded-md border border-input bg-transparent  px-3 py-1 shadow-sm
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
