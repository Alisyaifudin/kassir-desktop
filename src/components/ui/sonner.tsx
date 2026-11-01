import { Toaster as Sonner, ToasterProps } from "sonner";
import { useTheme } from "~/hooks/use-theme";

/**
 * Toasts follow the app's theme, not the OS's: the stored preference can be
 * `light` on a dark desktop, and a white toast over a dark app reads as a bug.
 * `useTheme` already resolves `system` against the OS, so the resolved look is
 * the right thing to hand sonner.
 */
const Toaster = ({ ...props }: ToasterProps) => {
	const { theme } = useTheme();

	return (
		<Sonner
			theme={theme}
			className="toaster group"
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
				} as React.CSSProperties
			}
			richColors
			position="bottom-right"
			{...props}
		/>
	);
};
export { Toaster };
