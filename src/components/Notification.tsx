export function Notification({ children }: { children: React.ReactNode }) {
	if (children === null) {
		return null;
	}
	return (
		<div className="absolute z-10 text-3xl bg-white p-5 bottom-0 right-0 shadow-xl border-accent border-t border-l m-3 max-w-[500px] w-fit flex flex-col gap-2">
			{children}
		</div>
	);
}
