import React from "react";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
const Password = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, ...props }, ref) => {
		return (
			<div className="relative">
				<Input type={"password"} className={cn("pr-5", className)} ref={ref} {...props} />
			</div>
		);
	}
);
Password.displayName = "Input";

export { Password };
