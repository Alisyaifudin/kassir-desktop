import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Nav } from "../block/nav";
import { Ul } from "../block/ul";
import { Li } from "../block/li";
import { buttonBaseStyle, buttonColorVariants } from "./button";
import { sizes } from "~/tokens.stylex";
import { Link } from "../block/link";
import { Span } from "../block/text";

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  pagination: {
    display: "flex",
    width: "100%",
    justifyContent: "center",
    marginLeft: "auto",
    marginRight: "auto",
  },
  content: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.inputPadY,
  },
  ellipsis: {
    display: "flex",
    width: sizes.iconButtonSize,
    height: sizes.iconButtonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  srOnly: {
    position: "absolute",
    width: sizes.srSize,
    height: sizes.srSize,
    padding: 0,
    margin: sizes.srMargin,
    overflow: "hidden",
    clip: sizes.srClip,
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});

// ── Components ───────────────────────────────────────────────────────────────

type PaginationProps = {
  style?: StyleXStyles;
};

export function Pagination({ style, ...props }: PaginationProps) {
  return (
    <Nav aria-label="pagination" style={[styles.pagination, style] as StyleXStyles} {...props} />
  );
}
Pagination.displayName = "Pagination";

type PaginationContentProps = {
  style?: StyleXStyles;
  ref?: React.Ref<HTMLUListElement>;
};

export function PaginationContent({ style, ref, ...props }: PaginationContentProps) {
  return <Ul ref={ref} style={[styles.content, style] as StyleXStyles} {...props} />;
}
PaginationContent.displayName = "PaginationContent";

type PaginationItemProps = {
  style?: StyleXStyles;
  ref?: React.Ref<HTMLLIElement>;
};

export function PaginationItem({ style, ref, ...props }: PaginationItemProps) {
  return <Li ref={ref} style={style} {...props} />;
}
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  style?: StyleXStyles;
  ref?: React.Ref<HTMLAnchorElement>;
};

export function PaginationLink({
  isActive,
  style,
  ref,
  ...props
}: PaginationLinkProps & React.ComponentProps<typeof Link>) {
  const variant = isActive ? "outline" : "ghost";
  return (
    <Link
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      {...stylex.props([buttonBaseStyle.base, buttonColorVariants[variant], style] as StyleXStyles)}
      {...props}
    />
  );
}
PaginationLink.displayName = "PaginationLink";

type PaginationPreviousProps = {
  style?: StyleXStyles;
};

export function PaginationPrevious({
  style,
  ...props
}: PaginationPreviousProps & React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Go to previous page" style={style} {...props}>
      <ChevronLeft />
    </PaginationLink>
  );
}
PaginationPrevious.displayName = "PaginationPrevious";

type PaginationNextProps = {
  style?: StyleXStyles;
};

export function PaginationNext({
  style,
  ...props
}: PaginationNextProps & React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Go to next page" style={style} {...props}>
      <ChevronRight />
    </PaginationLink>
  );
}
PaginationNext.displayName = "PaginationNext";

type PaginationEllipsisProps = {
  style?: StyleXStyles;
  ref?: React.Ref<HTMLSpanElement>;
};

export function PaginationEllipsis({
  style,
  ref,
  ...props
}: PaginationEllipsisProps & React.ComponentProps<typeof Span>) {
  return (
    <Span
      aria-hidden
      ref={ref}
      {...stylex.props([styles.ellipsis, style] as StyleXStyles)}
      {...props}
    >
      <MoreHorizontal />
      <Span {...stylex.props(styles.srOnly)}>More pages</Span>
    </Span>
  );
}
PaginationEllipsis.displayName = "PaginationEllipsis";
