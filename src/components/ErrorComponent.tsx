import * as stylex from "@stylexjs/stylex";
import { Block } from "~/components/block/block";
import { H1, H2 } from "~/components/block/heading";
import { Text } from "~/components/block/text";
import { ButtonBase } from "~/components/block/button";
import { colors, sizes } from "~/tokens.stylex";
import { Effect } from "effect";
import { RouterService } from "~/services/router";

// ── Styles ───────────────────────────────────────────────────────────────────

const outerStyles = stylex.create({
  base: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: sizes.padXl,
    paddingRight: sizes.padXl,
  },
});

const innerStyles = stylex.create({
  base: {
    maxWidth: sizes.maxWidthMd,
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: sizes.gapLg,
  },
});

const statusStyles = stylex.create({
  base: {
    fontSize: sizes.textStatus,
    lineHeight: sizes.lineHeightStatus,
    fontWeight: 700,
    color: colors.mutedForeground,
  },
});

const titleStyles = stylex.create({
  base: {
    fontSize: sizes.textErrorTitle,
    lineHeight: sizes.lineHeightErrorTitle,
    fontWeight: 600,
  },
});

const descriptionStyles = stylex.create({
  base: {
    color: colors.mutedForeground,
  },
});

const buttonGroupStyles = stylex.create({
  base: {
    display: "flex",
    gap: sizes.gapMd,
    justifyContent: "center",
    paddingTop: sizes.buttonPadX,
  },
});

const backButtonStyles = stylex.create({
  base: {
    paddingLeft: sizes.buttonPadX,
    paddingRight: sizes.buttonPadX,
    paddingTop: sizes.buttonPadY,
    paddingBottom: sizes.buttonPadY,
    borderRadius: sizes.radiusSm,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.border,
    background: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "inherit",
  },
});

const homeButtonStyles = stylex.create({
  base: {
    paddingLeft: sizes.buttonPadX,
    paddingRight: sizes.buttonPadX,
    paddingTop: sizes.buttonPadY,
    paddingBottom: sizes.buttonPadY,
    borderRadius: sizes.radiusSm,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "inherit",
  },
});

// ── Component ────────────────────────────────────────────────────────────────

export const errorComponent = Effect.gen(function* () {
  const routerService = yield* RouterService;
  const useNavigate = () => routerService.useNavigate();
  return function ErrorComponent({
    status,
    children,
    title = "Ada Kendala",
  }: {
    status?: number;
    children: React.ReactNode;
    title?: string;
  }) {
    const navigate = useNavigate();

    return (
      <Block style={outerStyles.base}>
        <Block style={innerStyles.base}>
          {status && <H1 style={statusStyles.base}>{status}</H1>}

          <H2 style={titleStyles.base}>{title}</H2>

          <Text style={descriptionStyles.base}>{children}</Text>

          <Block style={buttonGroupStyles.base}>
            <ButtonBase onClick={() => navigate(-1)} style={backButtonStyles.base}>
              Kembali
            </ButtonBase>

            <ButtonBase
              onClick={() => navigate("/", { replace: true })}
              style={homeButtonStyles.base}
            >
              Beranda
            </ButtonBase>
          </Block>
        </Block>
      </Block>
    );
  };
});
