import { useEffect, useRef } from "react";

export function usePrint() {
	const styleRef = useRef<HTMLStyleElement | null>(null);
	const printRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const style = document.createElement("style");
		style.textContent = `
        @media print {
          @page {
            size: var(--paper-width)mm auto;
            margin: 10mm;
          }
          body {
            visibility: hidden;
          }
          #print-container {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `;
		document.head.appendChild(style);
		styleRef.current = style;

		return () => {
			if (styleRef.current) {
				document.head.removeChild(styleRef.current);
				styleRef.current = null;
			}
		};
	}, []);
	useEffect(() => {
		if (printRef.current === null) {
			return;
		}
		printRef.current.focus();
	}, [printRef]);
	const print = () => {
		document.documentElement.style.setProperty("--paper-width", `72`);
		window.print();
	};
	return { ref: printRef, print };
}
