import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast, ToasterProps } from "sonner";

type Props = Omit<ToasterProps, "className" | "style"> & {
  style?: StyleXStyles;
};

const Toaster = ({ style, ...props }: Props) => {
  const { theme = "system" } = useTheme();
  const { style: sxStyle, ...rest } = stylex.props(style);
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      {...rest}
      className="toast"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          ...sxStyle,
        } as React.CSSProperties
      }
      richColors
      position="bottom-right"
      {...props}
    />
  );
};

export type ToastSonner = typeof toast;
export { Toaster };
