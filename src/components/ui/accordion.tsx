import type { ReactNode, Ref } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { ChevronDown } from "lucide-react";
import { colors, sizes } from "~/tokens.stylex";
import { Block } from "../block/block";

// ── Styles ───────────────────────────────────────────────────────────────────

const itemStyles = stylex.create({
  base: {
    borderBottomWidth: sizes.borderWidth,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
});

const triggerStyles = stylex.create({
  header: {
    display: "flex",
  },
  trigger: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: sizes.accordionPadY,
    paddingBottom: sizes.accordionPadY,
    fontWeight: 500,
    transitionProperty: "all",
    transitionDuration: "150ms",
    textAlign: "left",
    background: "none",
    border: "none",
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "inherit",
    cursor: "pointer",
    ":hover": {
      textDecoration: "underline",
    },
  },
  chevron: {
    height: sizes.iconSize,
    width: sizes.iconSize,
    flexShrink: 0,
    color: colors.mutedForeground,
    transitionProperty: "transform",
    transitionDuration: "200ms",
  },
});

const contentStyles = stylex.create({
  base: {
    overflow: "hidden",
  },
  inner: {
    paddingBottom: sizes.accordionPadY,
    paddingTop: 0,
  },
});

// ── Components ───────────────────────────────────────────────────────────────

const Accordion = AccordionPrimitive.Root;

type AccordionItemProps = {
  ref?: Ref<HTMLDivElement>;
  style?: StyleXStyles;
  children?: ReactNode;
  value: string;
};

const AccordionItem = ({ style, children, ref, ...props }: AccordionItemProps) => {
  const merged = [itemStyles.base, style] as StyleXStyles;
  return (
    <AccordionPrimitive.Item ref={ref} {...stylex.props(merged)} {...props}>
      {children}
    </AccordionPrimitive.Item>
  );
};

type AccordionTriggerProps = {
  ref?: Ref<HTMLButtonElement>;
  style?: StyleXStyles;
  children?: ReactNode;
};

const AccordionTrigger = ({ style, children, ref, ...props }: AccordionTriggerProps) => {
  const mergedTrigger = [triggerStyles.trigger, style] as StyleXStyles;

  return (
    <AccordionPrimitive.Header {...stylex.props(triggerStyles.header)}>
      <AccordionPrimitive.Trigger
        ref={ref}
        {...stylex.props(mergedTrigger)}
        {...props}
        data-accordion-trigger=""
      >
        {children}
        <ChevronDown {...stylex.props(triggerStyles.chevron)} />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
};

type AccordionContentProps = {
  ref?: Ref<HTMLDivElement>;
  style?: StyleXStyles;
  children?: ReactNode;
};

const AccordionContent = ({ style, children, ref, ...props }: AccordionContentProps) => {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      {...stylex.props(contentStyles.base)}
      {...props}
      data-accordion-content=""
    >
      <Block style={[contentStyles.inner, style] as StyleXStyles}>{children}</Block>
    </AccordionPrimitive.Content>
  );
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
