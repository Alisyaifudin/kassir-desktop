import { useOutletContext } from "react-router";
import { User } from "~/lib/auth";

export const useUser = () => {
	const context = useOutletContext<{ user: User }|null>();
	if (context === null) {
		throw new Error("Outside the provider")
	}
	return context.user;
};
