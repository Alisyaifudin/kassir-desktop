/**
 * Tiny console/logging helpers for the audit loop.
 *
 * The loop is long-running, so every line is timestamped and scoped. Colors are
 * disabled automatically when stdout is not a TTY or NO_COLOR is set.
 */

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

function paint(code: string, text: string): string {
  if (!useColor) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

export const color = {
  dim: (s: string) => paint("2", s),
  bold: (s: string) => paint("1", s),
  red: (s: string) => paint("31", s),
  green: (s: string) => paint("32", s),
  yellow: (s: string) => paint("33", s),
  blue: (s: string) => paint("34", s),
  magenta: (s: string) => paint("35", s),
  cyan: (s: string) => paint("36", s),
  gray: (s: string) => paint("90", s),
};

function clock(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

export function log(scope: string, message: string): void {
  console.log(`${color.gray(clock())} ${color.cyan(`[${scope}]`)} ${message}`);
}

export function warn(scope: string, message: string): void {
  console.warn(`${color.gray(clock())} ${color.yellow(`[${scope}]`)} ${message}`);
}

export function error(scope: string, message: string): void {
  console.error(`${color.gray(clock())} ${color.red(`[${scope}]`)} ${message}`);
}

export function section(title: string): void {
  const line = "─".repeat(Math.max(8, Math.min(72, title.length + 8)));
  console.log(`\n${color.blue(line)}`);
  console.log(`${color.bold(color.blue(title))}`);
  console.log(`${color.blue(line)}`);
}

export function banner(lines: string[]): void {
  console.log(`\n${color.magenta("╔" + "═".repeat(70) + "╗")}`);
  for (const line of lines) {
    const visible = line.replace(/\u001b\[[0-9;]*m/g, "");
    const pad = Math.max(0, 70 - visible.length);
    console.log(`${color.magenta("║")} ${line}${" ".repeat(pad)} ${color.magenta("║")}`);
  }
  console.log(`${color.magenta("╚" + "═".repeat(70) + "╝")}\n`);
}

export function shortPath(path: string, max = 90): string {
  if (path.length <= max) return path;
  return "…" + path.slice(path.length - max + 1);
}

export function oneLine(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
