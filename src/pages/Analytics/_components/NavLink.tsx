import { Button } from "~/components/ui/button";

type Option = "cashflow" | "profit" | "crowd" | "products";

export function NavLink<T extends Option>({
	onClick,
	option,
	children,
	selectedOption,
}: {
	onClick: (option: T) => void;
	option: T;
	children: string;
	selectedOption: "cashflow" | "profit" | "crowd" | "products";
}) {
	return (
		<Button
			onClick={() => onClick(option)}
			variant={option === selectedOption ? "default" : "link"}
		>
			{children}
		</Button>
	);
}
