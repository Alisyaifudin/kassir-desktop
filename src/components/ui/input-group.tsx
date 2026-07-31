import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

import { Icon } from "~/components/ui/icon";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { colors, sizes } from "~/tokens.stylex";
import { Block } from "../block/block";
import { Span } from "../block/text";

// ── Styles ───────────────────────────────────────────────────────────────────

const groupStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    width: "100%",
    alignItems: "center",
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    boxShadow: colors.shadowSm,
    transitionProperty: "color, box-shadow",
    outline: "none",
    height: sizes.inputHeight,
    minWidth: 0,
    backgroundColor: "transparent",
  },
});

const addonStyles = stylex.create({
  base: {
    display: "flex",
    height: "auto",
    cursor: "text",
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.gapSm,
    paddingTop: sizes.inputPadY,
    paddingBottom: sizes.inputPadY,
    fontSize: sizes.textSm,
    fontWeight: 500,
    color: colors.mutedForeground,
    userSelect: "none",
  },
  inlineStart: {
    order: -1,
    paddingLeft: sizes.inputPadX,
  },
  inlineEnd: {
    order: 9999,
    paddingRight: sizes.inputPadX,
  },
  blockStart: {
    order: -1,
    width: "100%",
    justifyContent: "flex-start",
    paddingLeft: sizes.inputPadX,
    paddingRight: sizes.inputPadX,
    paddingTop: sizes.inputPadX,
  },
  blockEnd: {
    order: 9999,
    width: "100%",
    justifyContent: "flex-start",
    paddingLeft: sizes.inputPadX,
    paddingRight: sizes.inputPadX,
    paddingBottom: sizes.inputPadX,
  },
});

const buttonBase = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.gapSm,
    fontSize: sizes.textSm,
    boxShadow: "none",
    borderRadius: sizes.radiusSm,
  },
  xs: {
    height: sizes.buttonXsHeight,
    paddingLeft: sizes.gapSm,
    paddingRight: sizes.gapSm,
  },
  sm: {
    height: sizes.buttonSmHeight,
    paddingLeft: sizes.buttonSmPadX,
    paddingRight: sizes.buttonSmPadX,
  },
  iconXs: {
    width: sizes.buttonXsHeight,
    height: sizes.buttonXsHeight,
    padding: 0,
  },
  iconSm: {
    width: sizes.buttonSmHeight,
    height: sizes.buttonSmHeight,
    padding: 0,
  },
});

const textStyles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    gap: sizes.gapSm,
    fontSize: sizes.textSm,
    color: colors.mutedForeground,
  },
});

const inputStyles = stylex.create({
  base: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
  },
});

const textareaStyles = stylex.create({
  base: {
    flex: 1,
    resize: "none",
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingTop: sizes.inputPadX,
    paddingBottom: sizes.inputPadX,
    boxShadow: "none",
  },
});

// ── Components ───────────────────────────────────────────────────────────────

type InputGroupProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

function InputGroup({ style, children, ref, ...props }: InputGroupProps) {
  return (
    <Block
      ref={ref}
      data-slot="input-group"
      role="group"
      {...stylex.props([groupStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </Block>
  );
}

type AddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

const ALIGN_MAP: Record<AddonAlign, StyleXStyles> = {
  "inline-start": addonStyles.inlineStart,
  "inline-end": addonStyles.inlineEnd,
  "block-start": addonStyles.blockStart,
  "block-end": addonStyles.blockEnd,
};

type InputGroupAddonProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  align?: AddonAlign;
};

function InputGroupAddon({
  style,
  children,
  ref,
  align = "inline-start",
  ...props
}: InputGroupAddonProps) {
  return (
    <Block
      ref={ref}
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      {...stylex.props([addonStyles.base, ALIGN_MAP[align], style] as StyleXStyles)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    >
      {children}
    </Block>
  );
}

type ButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";

const SIZE_MAP: Record<ButtonSize, StyleXStyles> = {
  xs: buttonBase.xs,
  sm: buttonBase.sm,
  "icon-xs": buttonBase.iconXs,
  "icon-sm": buttonBase.iconSm,
};

type InputGroupButtonProps = {
  style?: StyleXStyles;
  variant?: "ghost" | "default" | "outline" | "secondary" | "destructive";
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
};

function InputGroupButton({
  style,
  variant = "ghost",
  size = "xs",
  ...props
}: InputGroupButtonProps) {
  return (
    <Icon
      variant={variant}
      style={[buttonBase.base, SIZE_MAP[size], style] as StyleXStyles}
      {...props}
    />
  );
}

type InputGroupTextProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
};

function InputGroupText({ style, children, ref, ...props }: InputGroupTextProps) {
  return (
    <Span ref={ref} style={[textStyles.base, style] as StyleXStyles} {...props}>
      {children}
    </Span>
  );
}

type InputGroupInputProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLInputElement>;
  id?: string;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
};

function InputGroupInput({ style, ref, ...props }: InputGroupInputProps) {
  return (
    <Input
      ref={ref}
      data-slot="input-group-control"
      style={[inputStyles.base, style] as StyleXStyles}
      {...props}
    />
  );
}

type InputGroupTextareaProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLTextAreaElement>;
};

function InputGroupTextarea({ style, ref, ...props }: InputGroupTextareaProps) {
  return (
    <Textarea
      ref={ref}
      data-slot="input-group-control"
      style={[textareaStyles.base, style] as StyleXStyles}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
