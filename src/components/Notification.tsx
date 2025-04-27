import { createContext, useContext, useState } from "react";

const NotifContext = createContext<{
	notify: (notification: React.ReactNode) => void;
}>({
	notify: () => {},
});

export const NotifProvider = NotifContext.Provider;

export const useNotification = () => {
	const { notify } = useContext(NotifContext);
	return { notify };
};

export function Notification() {
	const [notification, setNotification] = useState<React.ReactNode>(null);
	const notify = (notification: React.ReactNode) => setNotification(notification);
	return (
		<NotifProvider value={{ notify }}>
			<Content>{notification}</Content>
		</NotifProvider>
	);
}

function Content({ children }: { children: React.ReactNode }) {
	if (children === null) {
		return null;
	}
	return (
		<div className="absolute z-10 bg-white p-3 bottom-0 right-0 shadow-xl border-accent border-t border-l m-3 w-[200px] flex flex-col gap-2">
			{children}
			
		</div>
	);
}
