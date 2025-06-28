import { cn } from "~/lib/utils";

type TextErrorProps =(
	| { children: string | null | undefined }
	| {
			when: boolean;
			children: string;
	  }) & {className?: string}

export function TextError(props: TextErrorProps) {
	if ("when" in props) {
		if (typeof props.when === "boolean") {
			if (props.when) {
				return <p className={cn("text-2xl text-red-500", props.className)}>{props.children}</p>;
			}
			return null;
		}
	} else {
		if (props.children === null || props.children === undefined || props.children === "")
			return null;
		return <p className={cn("text-2xl text-red-500", props.className)}>{props.children}</p>;
	}
}