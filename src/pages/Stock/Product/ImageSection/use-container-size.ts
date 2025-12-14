import { useEffect, useRef, useState } from "react";

export const useContainerSize = () => {
	const dom = document.getElementById("image-container") as null | HTMLDivElement;
	const [screenSize, setScreenSize] = useState({
		width: dom?.clientWidth ?? 0,
		height: dom?.clientHeight ?? 0,
	});

	useEffect(() => {
		const handleResize = () => {
			setScreenSize({
				width: dom?.clientWidth ?? 0,
				height: dom?.clientHeight ?? 0,
			});
		};
		setScreenSize({
			width: dom?.clientWidth ?? 0,
			height: dom?.clientHeight ?? 0,
		});

		window.addEventListener("resize", handleResize);

		// Cleanup listener on unmount
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return screenSize;
};

export const useControlSize = () => {
	const ref = useRef<HTMLDivElement>(null);
	const [screenSize, setScreenSize] = useState({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		if (ref.current === null) return;
		const handleResize = (dom: HTMLDivElement) => () => {
			setScreenSize({
				width: dom.clientWidth ?? 0,
				height: dom.clientHeight ?? 0,
			});
		};
		const dom = ref.current;
		setScreenSize({
			width: dom.clientWidth ?? 0,
			height: dom.clientHeight ?? 0,
		});
		window.addEventListener("resize", handleResize(dom));

		// Cleanup listener on unmount
		return () => window.removeEventListener("resize", handleResize(dom));
	}, [ref]);

	return [ref, screenSize] as const;
};
