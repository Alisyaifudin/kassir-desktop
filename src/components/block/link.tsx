import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { Link as LinkRR } from "react-router";

type LinkProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
  to:
    | string
    | {
        pathname?: string | undefined;
        search?: string | undefined;
        hash?: string | undefined;
      };
  "aria-current"?:
    | boolean
    | "false"
    | "true"
    | "page"
    | "step"
    | "location"
    | "date"
    | "time"
    | undefined;
  "aria-label"?: string;
};

export function Link({ style, children, ref, ...rest }: LinkProps) {
  return (
    <LinkRR ref={ref} {...stylex.props(style)} {...rest}>
      {children}
    </LinkRR>
  );
}
