import { useDB } from "~/RootLayout";
import { useAsync } from "./useAsync";

export const useProducts = () => {
	const db = useDB();
	const state = useAsync(() => db.product.getAll());
  return state;
};
