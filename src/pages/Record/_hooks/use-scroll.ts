import { useEffect, useRef } from "react";
import { numeric } from "~/lib/utils";

export function useScroll() {
	const ref = useRef<HTMLDivElement>(null);
	const isProgrammaticScroll = useRef(false);
	// Restore scroll position on component mount
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const parsed = numeric.safeParse(params.get("scroll"));
		const scrollTop = parsed.success ? parsed.data : 0;

		if (scrollTop && ref.current) {
			isProgrammaticScroll.current = true;
			ref.current.scrollTop = scrollTop;
			// Reset the flag after scroll completes
			setTimeout(() => {
				isProgrammaticScroll.current = false;
			}, 100);
		}
	}, []);
	// Throttled scroll handler
	const handleScroll = () => {
		if (isProgrammaticScroll.current || !ref.current) return;
		const scrollTop = ref.current.scrollTop;
		const params = new URLSearchParams(window.location.search);
		params.set("scroll", scrollTop.toString());
		const url = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, "", url);
	};
  return {handleScroll, ref}
}
