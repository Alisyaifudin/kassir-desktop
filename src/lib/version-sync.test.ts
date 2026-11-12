/**
 * Guards the version, which lives in six places and drifts silently.
 *
 * `package.json` is the authority, but it is not what ships the number:
 * `tauri.conf.json` stamps the MSI filename and `app.package_info()`,
 * `Cargo.toml` fills `CARGO_PKG_VERSION` (the sync client's User-Agent and the
 * backup manifest), `constants.ts` is what Settings prints, and
 * `specification.xml` is the document that claims all of them are in step. A
 * bump that touches some of them passes every other gate: the bundle builds,
 * the tests run, the app just reports a version it is not — and a backup
 * manifest written by 8.18.1 says 8.13.0.
 *
 * This is not hypothetical: 8.18.1 shipped with `specification.xml` still on
 * 8.13.0, five releases behind, because nothing read the two together.
 *
 * The lock file is in the list because every historical bump commit touched it.
 * It is the one site cargo refreshes for you, so a red row naming
 * `Cargo.lock` alone means "run any cargo command", not "edit the lock".
 *
 * Run with:  bun test src/lib/version-sync.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/** What each site is, in the words of the failure message. */
const REMEDY: Record<string, string> = {
  "package.json": "the authority — bump this first, then the rest follow",
  "src-tauri/tauri.conf.json": "the MSI version and app.package_info()",
  "src-tauri/Cargo.toml": "CARGO_PKG_VERSION: sync User-Agent + backup manifest",
  "src-tauri/Cargo.lock":
    "not hand-edited — any cargo command (e.g. `cargo test --manifest-path src-tauri/Cargo.toml`) rewrites it",
  "src/lib/constants.ts": "what Settings prints as “Kassir versi …”",
  "specification.xml": "the spec's own <version> and its package.json / Cargo.toml entries",
};

type Site = { file: string; version: string };

const read = (file: string) => readFileSync(file, "utf8");

/** The first capture of `pattern` in `text`, or "" so a changed shape reads as drift. */
function capture(text: string, pattern: RegExp): string {
  return pattern.exec(text)?.[1] ?? "";
}

/**
 * `[package] version`, not the first `version =` line: every dependency block
 * below it has one too, and a table match would happily return serde's.
 */
function cargoPackageVersion(toml: string): string {
  const section = toml.split(/^\[/m).find((chunk) => chunk.startsWith("package]"));
  return section ? capture(section, /^version\s*=\s*"([^"]+)"/m) : "";
}

/** The `[[package]]` block whose name is kassir — the crate, not a dependency. */
function cargoLockVersion(lock: string): string {
  const block = lock
    .split("[[package]]")
    .find((chunk) => /^\s*name = "kassir"\s*$/m.test(chunk));
  return block ? capture(block, /^version\s*=\s*"([^"]+)"/m) : "";
}

/** Both numeric entries: `<entry key="version">` and `<entry key="package.version">`. */
function specEntryVersions(xml: string): string[] {
  return [...xml.matchAll(/<entry key="(?:package\.)?version">(\d[^<]*)<\/entry>/g)].map(
    (match) => match[1],
  );
}

function sites(): Site[] {
  const xml = read("specification.xml");
  const entries = specEntryVersions(xml);
  return [
    { file: "package.json", version: (JSON.parse(read("package.json")) as { version: string }).version },
    {
      file: "src-tauri/tauri.conf.json",
      version: (JSON.parse(read("src-tauri/tauri.conf.json")) as { version: string }).version,
    },
    { file: "src-tauri/Cargo.toml", version: cargoPackageVersion(read("src-tauri/Cargo.toml")) },
    { file: "src-tauri/Cargo.lock", version: cargoLockVersion(read("src-tauri/Cargo.lock")) },
    {
      file: "src/lib/constants.ts",
      version: capture(read("src/lib/constants.ts"), /^export const version = "([^"]+)"/m),
    },
    // The top-level <version>, plus the two documented copies in <config>.
    { file: "specification.xml", version: capture(xml, /<version>([^<]+)<\/version>/) },
    ...entries.map((version, index) => ({
      file: `specification.xml (entry ${index + 1}/${entries.length})`,
      version,
    })),
  ];
}

describe("version", () => {
  test("is readable from every bump site", () => {
    // A renamed key or a reflowed file must fail here, loudly, rather than
    // extract "" and turn the next test into a riddle about empty strings.
    const blank = sites().filter((site) => !/^\d+\.\d+\.\d+/.test(site.version));
    expect(blank, "no semver found — the file shape changed, fix the extractor").toEqual([]);
  });

  test("is the same in every bump site", () => {
    const all = sites();
    const shipped = all[0].version;
    const drift = all.filter((site) => site.version !== shipped);

    expect(
      drift,
      drift.map((site) => `  ${site.file} is ${site.version} — ${REMEDY[site.file] ?? ""}`).join("\n"),
    ).toEqual([]);
  });
});
