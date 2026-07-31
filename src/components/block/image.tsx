import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";

type ImageProps = {
  id?: string;
  style?: StyleXStyles;
  ref?: Ref<HTMLImageElement>;
  src?: string;
  alt?: string;
  title?: string;
} & React.AriaAttributes;

export function Image({ style, ref, ...props }: ImageProps) {
  return <img ref={ref} {...stylex.props(style)} {...props} />;
}
