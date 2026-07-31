import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { Link as LinkRR } from "react-router";
import { To } from "~/services/router";

type LinkProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
  to: To;
} & React.AriaAttributes;

export function Link({ style, children, ref, ...props }: LinkProps) {
  return (
    <LinkRR ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </LinkRR>
  );
}
