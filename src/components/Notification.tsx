import { useEffect, useState } from "react";

let globalNotification: React.ReactNode = null;
const subscribers = new Set<React.Dispatch<React.SetStateAction<React.ReactNode>>>();

export const useNotification = () => {
	const [notification, setNotification] = useState<React.ReactNode>(globalNotification);

	useEffect(() => {
		subscribers.add(setNotification);
		return () => {
			subscribers.delete(setNotification);
		};
	}, []);

	const notify = (newNotification: React.ReactNode) => {
		globalNotification = newNotification;
		subscribers.forEach((setter) => setter(newNotification));
	};

	return { notification, notify };
};

export function Notification() {
	const { notification } = useNotification();
	return <Content>{notification}</Content>;
}

function Content({ children }: { children: React.ReactNode }) {
	if (children === null) {
		return null;
	}
	return (
		<div className="absolute z-10 text-3xl bg-white p-5 bottom-0 right-0 shadow-xl border-accent border-t border-l m-3 max-w-[500px] w-fit flex flex-col gap-2">
			{children}
		</div>
	);
}
