import { Loader2 } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import { colors, sizes } from "~/tokens.stylex";
import { Block } from "~/components/block/block";
import { useEffect, useState } from "react";

const spin = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  icon: {
    width: sizes.topnavIconInner,
    height: sizes.topnavIconInner,
    color: `color-mix(in oklch, ${colors.primary} 70%, transparent)`,
    animationName: spin,
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});

const DELAY = 500; // ms

export function Loading() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let unmount = false;
    setTimeout(() => {
      if (unmount) return;
      setShow(true);
    }, DELAY);
    return () => {
      unmount = true;
    };
  }, []);
  if (!show) return null;
  return (
    <Block style={styles.wrapper}>
      <Loader2 {...stylex.props(styles.icon)} />
    </Block>
  );
}
