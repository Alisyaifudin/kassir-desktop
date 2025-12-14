import { useNavigation } from "react-router";

export function useLoading() {
	const navigation = useNavigation();
	return navigation.state === "submitting";
}
