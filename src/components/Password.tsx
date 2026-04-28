import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

const Password = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, ...props }, ref) => {
		const [show, setShow] = useState(false);
		return (
			<div className="relative flex items-center">
				<Input
					type={show ? "text" : "password"}
					className={cn("pr-10", className)}
					ref={ref}
					{...props}
				/>
				<button
					type="button"
					onClick={() => setShow((p) => !p)}
					className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
					tabIndex={-1}
				>
					{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
				</button>
			</div>
		);
	}
);

Password.displayName = "Password";

export { Password };
