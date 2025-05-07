export const Tooltip = ({
	children,
	position,
	visible,
}: {
	children: string;
	position: { x: number; y: number };
	visible: boolean;
}) => {
	return (
		<div
			style={{
				position: "fixed",
				left: `${position.x}px`,
				top: `${position.y}px`,
				backgroundColor: "rgba(0, 0, 0, 0.8)",
				color: "white",
				padding: "8px 12px",
				borderRadius: "4px",
				fontSize: "14px",
				pointerEvents: "none",
				zIndex: 1000,
				display: visible ? "block" : "none",
				transform: "translate(-100%, -100%)",
			}}
		>
			<p className="text-3xl">{children}</p>
		</div>
	);
};
