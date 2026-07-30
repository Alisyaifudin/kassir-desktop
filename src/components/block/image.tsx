import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";

type ImageProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLImageElement>;
  src?: string;
};

export function Image({ style, ref, src }: ImageProps) {
  return <img src={src} ref={ref} {...stylex.props(style)} />;
}
