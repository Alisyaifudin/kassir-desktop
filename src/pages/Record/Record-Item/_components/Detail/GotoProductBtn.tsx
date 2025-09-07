import { Pencil } from "lucide-react";
import { memo } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";

export const GotoProductBtn = memo(function ({
	mode,
	productId,
}: {
	mode: "buy" | "sell";
	productId: number | null;
}) {
	const navigate = useNavigate();
	if (mode === "sell" || productId === null) {
		return null;
	}
	const handleClick = () => {
		const backURL = encodeURIComponent(window.location.pathname + window.location.search);
		navigate({ pathname: `/stock/product/${productId}`, search: `?url_back=${backURL}` });
	};
	return (
		<>
			<Button className="p-0 cursor-pointer" variant="link" onClick={handleClick}>
				<Pencil />
			</Button>
			<div className="flex-1" />
		</>
	);
});
