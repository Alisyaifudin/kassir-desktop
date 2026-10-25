/**
 * Guards the shipped Tauri capability.
 *
 * The ACL is the only thing between a script running in the webview and the
 * machine, and its widest grant was invisible for three audits: `fs:default`
 * reads as "the default", but it includes `read-app-specific-dirs-recursive` —
 * recursive read of AppConfig/AppData/AppLocalData/AppCache/AppLog, i.e. the
 * directory that holds `sqlite:data.db`. Every fs call the app makes is covered
 * by the explicit `fs:read-files` / `fs:write-files` scopes below, so the
 * default set only added reach.
 *
 * Run with:  bun test src/lib/tauri-capability.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CAPABILITIES = "src-tauri/capabilities";

/** The only paths the frontend may name, per the capability's description. */
const ALLOWED_PATHS = new Set([
  "$APPDATA/images",
  "$APPDATA/images/**",
  "$APPLOCALDATA/logs",
  "$APPLOCALDATA/logs/**",
]);

type Permission = string | { identifier: string; allow?: { path: string }[] };

type Capability = {
  identifier: string;
  description?: string;
  permissions: Permission[];
};

function identifierOf(permission: Permission): string {
  return typeof permission === "string" ? permission : permission.identifier;
}

function capabilityFiles(): string[] {
  return readdirSync(CAPABILITIES).filter((name) => name.endsWith(".json"));
}

function capabilities(): Capability[] {
  return capabilityFiles().map(
    (name) => JSON.parse(readFileSync(join(CAPABILITIES, name), "utf8")) as Capability,
  );
}

describe("Tauri capability", () => {
  test("ships at least one capability", () => {
    expect(capabilities().length).toBeGreaterThan(0);
  });

  test("grants no blanket filesystem default", () => {
    for (const capability of capabilities()) {
      const identifiers = capability.permissions.map(identifierOf);
      expect(identifiers).not.toContain("fs:default");
      // Every fs set named must be an explicit allow/deny, never a recursive
      // app-dir read set.
      for (const id of identifiers) {
        expect(id).not.toMatch(/app-specific-dirs-recursive|read-all|write-all/);
      }
    }
  });

  test("scopes every filesystem path to images and logs", () => {
    for (const capability of capabilities()) {
      for (const permission of capability.permissions) {
        if (typeof permission === "string") continue;
        for (const entry of permission.allow ?? []) {
          expect(ALLOWED_PATHS.has(entry.path)).toBe(true);
        }
      }
    }
  });

  test("enables the commands the frontend actually calls", () => {
    const identifiers = capabilities().flatMap((capability) =>
      capability.permissions.map(identifierOf),
    );
    // image.ts: exists, mkdir, readFile, writeFile, remove.
    // log/live.ts: readTextFile, writeTextFile.
    expect(identifiers).toContain("fs:read-files");
    expect(identifiers).toContain("fs:write-files");
    expect(identifiers).toContain("fs:allow-mkdir");
  });

  test("grants no self-update or process-control permission", () => {
    // `updater:default` was granted to the main window for four audits while no
    // frontend code ever called `check()` — the single most powerful permission
    // in the ACL (downloads a signed installer and runs it) with no consumer.
    // The plugin, its crate, its config and the release artifacts are gone, so
    // the permission must never come back without the feature.
    const identifiers = capabilities().flatMap((capability) =>
      capability.permissions.map(identifierOf),
    );
    for (const id of identifiers) {
      expect(id).not.toMatch(/^updater:/);
      expect(id).not.toMatch(/^process:/);
    }

    const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
      plugins?: Record<string, unknown>;
      bundle?: { createUpdaterArtifacts?: boolean };
    };
    expect(conf.plugins?.updater).toBeUndefined();
    expect(conf.bundle?.createUpdaterArtifacts).toBe(false);
  });

  test("says what it grants, including the deliberate holes", () => {
    // The description used to claim least privilege while `fs:default` was in
    // the list, which is how the over-grant survived three audits.
    const main = capabilities().find((capability) =>
      capability.permissions
        .map(identifierOf)
        .some((identifier) => identifier.startsWith("fs:")),
    );
    expect(main).toBeDefined();
    const description = main?.description ?? "";
    expect(description).toContain("fs:read-files");
    expect(description).toContain("fs:allow-mkdir");
    expect(description).toContain("fs:default");
    expect(description).toContain("$APPDATA/images");
    expect(description).toContain("sql:allow-execute");
  });
});
