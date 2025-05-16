import { cn } from "~/lib/utils";

export function TextError({ children, className }: { children: string; className?: string }) {
	return <p className={cn("text-2xl text-red-500", className)}>{children}</p>;
}
