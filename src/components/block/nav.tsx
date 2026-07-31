import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type NavProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
} & React.AriaAttributes;

export function Nav({ style, children, ref, ...props }: NavProps) {
  return (
    <nav ref={ref} role="navigation" {...stylex.props(style)} {...props}>
      {children}
    </nav>
  );
}
