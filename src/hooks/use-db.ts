import { useOutletContext } from "react-router";
import { type Database } from "../database";

export const useDB = () => {
	const context = useOutletContext<{ db: Database }|null>();
	if (context === null) {
		throw new Error("Outside the provider")
	}
	return context.db;
};
