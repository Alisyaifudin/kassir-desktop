import { describe, expect, test } from "bun:test";
import { navGroupsOf, navItemOf, navOf } from "./util-nav";

/**
 * The single source of truth for the settings destinations. The hub row list and
 * the sidebar both read it, so the order, the role gate and the wording a page
 * quotes in its head all come from one table.
 */
describe("navOf", () => {
  test("a cashier may open only their profile", () => {
    expect(navOf("user").map((item) => item.path)).toEqual(["/setting/profile"]);
  });

  test("an admin sees every destination, in sidebar order", () => {
    expect(navOf("admin").map((item) => item.label)).toEqual([
      "Profil",
      "Toko",
      "Data",
      "Sinkronisasi",
      "Printer",
      "Log",
    ]);
  });
});

describe("navItemOf", () => {
  test("finds the destination a screen belongs to", () => {
    const item = navItemOf("/setting/log");

    expect(item.label).toBe("Log");
    expect(item.section).toBe("Sistem");
    expect(item.description).not.toBe("");
  });

  test("an unknown path is a programming error, not a blank head", () => {
    expect(() => navItemOf("/setting/nope")).toThrow("Unknown settings path: /setting/nope");
  });
});

describe("navGroupsOf", () => {
  test("groups in section order and drops sections the role cannot open", () => {
    expect(navGroupsOf("user").map((group) => group.section)).toEqual(["Akun"]);
    expect(navGroupsOf("admin").map((group) => group.section)).toEqual([
      "Akun",
      "Toko",
      "Sistem",
    ]);
  });

  test("each group keeps the sidebar's item order", () => {
    const sistem = navGroupsOf("admin").find((group) => group.section === "Sistem");
    expect(sistem?.items.map((item) => item.label)).toEqual([
      "Data",
      "Sinkronisasi",
      "Printer",
      "Log",
    ]);
  });

  test("only the listed destinations are marked for admins", () => {
    expect(navItemOf("/setting/profile").roles).toContain("user");
    expect(navItemOf("/setting/shop").roles).toEqual(["admin"]);
  });
});
