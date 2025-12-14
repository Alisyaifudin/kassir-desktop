import { useState } from "react";
import { useOutletContext } from "react-router";

export const useNotification = () => {
	const [notification, setNotification] = useState<React.ReactNode>(null);

	const notify = (newNotification: React.ReactNode) => {
		setNotification(newNotification);
	};

	return { notification, notify };
};

export function useNotify() {
	const context = useOutletContext<{ notify: (newNotification: React.ReactNode) => void } | null>();
	if (context === null) {
		throw new Error("Outside the provider");
	}
	return context.notify;
}
