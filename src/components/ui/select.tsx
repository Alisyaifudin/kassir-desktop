import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

import { colors, sizes } from "~/tokens.stylex";
import { Show } from "../Show";
import { Span } from "../block/text";

// ── Styles ───────────────────────────────────────────────────────────────────

const triggerStyles = stylex.create({
  base: {
    display: "flex",
    width: "fit-content",
    alignItems: "center",
    justifyContent: "space-between",
    gap: sizes.gapSm,
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: "transparent",
    paddingLeft: sizes.inputPadX,
    paddingRight: sizes.inputPadX,
    paddingTop: sizes.gapSm,
    paddingBottom: sizes.gapSm,
    whiteSpace: "nowrap",
    boxShadow: colors.shadowSm,
    transitionProperty: "color, box-shadow",
    outline: "none",
    ":focus-visible": {
      borderColor: colors.ring,
      boxShadow: `0 0 0 3px color-mix(in oklch, ${colors.ring} 50%, transparent)`,
    },
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
  icon: {
    opacity: 0.5,
  },
});

const contentStyles = stylex.create({
  base: {
    position: "relative",
    zIndex: 50,
    maxHeight: "var(--radix-select-content-available-height)",
    minWidth: sizes.selectMinWidth,
    overflowX: "hidden",
    overflowY: "auto",
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: colors.popover,
    color: colors.popoverForeground,
    boxShadow: colors.shadow,
  },
});

const viewportStyles = stylex.create({
  base: {
    padding: sizes.inputPadY,
    height: "var(--radix-select-trigger-height)",
    width: "100%",
    minWidth: "var(--radix-select-trigger-width)",
  },
});

const labelStyles = stylex.create({
  base: {
    paddingLeft: sizes.gapSm,
    paddingRight: sizes.gapSm,
    paddingTop: sizes.selectPadY,
    paddingBottom: sizes.selectPadY,
    color: colors.mutedForeground,
  },
});

const itemStyles = stylex.create({
  base: {
    position: "relative",
    display: "flex",
    width: "100%",
    cursor: "default",
    alignItems: "center",
    gap: sizes.gapSm,
    borderRadius: sizes.radiusXs,
    paddingTop: sizes.selectPadY,
    paddingBottom: sizes.selectPadY,
    paddingRight: sizes.selectItemPadRight,
    paddingLeft: sizes.gapSm,
    outline: "none",
    userSelect: "none",
    ":focus": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
    ":disabled": {
      pointerEvents: "none",
      opacity: 0.5,
    },
  },
  checkWrapper: {
    position: "absolute",
    right: sizes.gapSm,
    display: "flex",
    width: sizes.iconSize,
    height: sizes.iconSize,
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: {
    pointerEvents: "none",
  },
  kbdWrapper: {
    position: "absolute",
    right: sizes.gapSm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});

const separatorStyles = stylex.create({
  base: {
    height: sizes.separatorHeight,
    backgroundColor: colors.border,
    pointerEvents: "none",
    marginLeft: `-${sizes.inputPadY}`,
    marginRight: `-${sizes.inputPadY}`,
    marginTop: sizes.inputPadY,
    marginBottom: sizes.inputPadY,
  },
});

const scrollButtonStyles = stylex.create({
  base: {
    display: "flex",
    cursor: "default",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: sizes.inputPadY,
    paddingBottom: sizes.inputPadY,
  },
});

// ── Components ───────────────────────────────────────────────────────────────

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

type SelectTriggerProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

function SelectTrigger({ style, children, ref, ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-slot="select-trigger"
      {...stylex.props([triggerStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon {...stylex.props(triggerStyles.icon)} asChild>
        <ChevronDownIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

type SelectContentProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  position?: "item-aligned" | "popper";
  align?: "center" | "start" | "end";
};

function SelectContent({
  style,
  children,
  ref,
  position = "item-aligned",
  align = "center",
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        data-slot="select-content"
        position={position}
        align={align}
        {...stylex.props([contentStyles.base, style] as StyleXStyles)}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport {...stylex.props(viewportStyles.base)}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}
SelectContent.displayName = SelectPrimitive.Content.displayName;

type SelectLabelProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

function SelectLabel({ style, children, ref, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.Label
      ref={ref}
      data-slot="select-label"
      {...stylex.props([labelStyles.base, style] as StyleXStyles)}
      {...props}
    >
      {children}
    </SelectPrimitive.Label>
  );
}
SelectLabel.displayName = SelectPrimitive.Label.displayName;

type SelectItemProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
  kbd?: ReactNode;
  showCheck?: boolean;
  value: string;
};

function SelectItem({ style, children, ref, kbd, showCheck = false, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      data-slot="select-item"
      {...stylex.props([itemStyles.base, style] as StyleXStyles)}
      {...props}
    >
      <Show value={kbd}>
        {(kbd) => <span {...stylex.props(itemStyles.kbdWrapper)}>{kbd}</span>}
      </Show>
      <Show when={showCheck}>
        <Span style={itemStyles.checkWrapper}>
          <SelectPrimitive.ItemIndicator>
            <CheckIcon {...stylex.props(itemStyles.checkIcon)} />
          </SelectPrimitive.ItemIndicator>
        </Span>
      </Show>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
SelectItem.displayName = SelectPrimitive.Item.displayName;

type SelectSeparatorProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLDivElement>;
};

function SelectSeparator({ style, ref, ...props }: SelectSeparatorProps) {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      data-slot="select-separator"
      {...stylex.props([separatorStyles.base, style] as StyleXStyles)}
      {...props}
    />
  );
}
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

type SelectScrollButtonProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
};

function SelectScrollUpButton({ style, ref, ...props }: SelectScrollButtonProps) {
  return (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      data-slot="select-scroll-up-button"
      {...stylex.props([scrollButtonStyles.base, style] as StyleXStyles)}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({ style, ref, ...props }: SelectScrollButtonProps) {
  return (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      data-slot="select-scroll-down-button"
      {...stylex.props([scrollButtonStyles.base, style] as StyleXStyles)}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
