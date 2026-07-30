import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const listStyles = stylex.create({
  base: {
    display: "inline-flex",
    height: sizes.inputHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: sizes.radiusLg,
    backgroundColor: colors.muted,
    padding: sizes.inputPadY,
    color: colors.mutedForeground,
  },
});

const triggerStyles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    borderRadius: sizes.radiusMd,
    paddingLeft: sizes.inputPadX,
    paddingRight: sizes.inputPadX,
    paddingTop: sizes.inputPadY,
    paddingBottom: sizes.inputPadY,
    fontWeight: 500,
    transitionProperty: "all",
    ":focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 2px ${colors.ring}, 0 0 0 4px ${colors.background}`,
    },
    ":disabled": {
      pointerEvents: "none",
      opacity: 0.5,
    },
  },
});

const contentStyles = stylex.create({
  base: {
    marginTop: sizes.gap,
    ":focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 2px ${colors.ring}, 0 0 0 4px ${colors.background}`,
    },
  },
});

// ── Components ───────────────────────────────────────────────────────────────

const Tabs = TabsPrimitive.Root;

type TabsListProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

function TabsList({ style, children, ref, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      ref={ref}
      {...stylex.props([listStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}
TabsList.displayName = TabsPrimitive.List.displayName;

type TabsTriggerProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  value: string;
};

function TabsTrigger({ style, children, ref, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      {...stylex.props([triggerStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

type TabsContentProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  value: string;
};

function TabsContent({ style, children, ref, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      {...stylex.props([contentStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
