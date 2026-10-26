import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Effect } from "effect";

/**
 * Password hashing lives in Rust (`hash_password` / `verify_password`); this
 * module is the only thing standing between the login form and it. A wrong
 * password must be an `InvalidCredential` (the form shows "Kata sandi salah"),
 * while a broken app is an `InvokeError` — the two are not the same refusal.
 */
type Call = { cmd: string; args: Record<string, unknown> };

const calls: Call[] = [];
let outcome: { kind: "value"; value: unknown } | { kind: "error"; error: unknown } = {
  kind: "value",
  value: true,
};

// The rest of the `core` surface is here because a module mock is process-wide:
// another test file may still import the event bridge, which needs it.
mock.module("@tauri-apps/api/core", () => ({
  transformCallback: () => 1,
  Channel: class {},
  convertFileSrc: (path: string) => path,
  isTauri: () => false,
  invoke: (cmd: string, args?: Record<string, unknown>) => {
    calls.push({ cmd, args: args ?? {} });
    return outcome.kind === "error" ? Promise.reject(outcome.error) : Promise.resolve(outcome.value);
  },
}));

const { hash, verify } = await import("./auth");

beforeEach(() => {
  calls.length = 0;
  outcome = { kind: "value", value: true };
});

describe("hash", () => {
  test("sends the password to the Rust hasher and returns its hash", async () => {
    outcome = { kind: "value", value: "$2b$12$abc" };

    expect(await Effect.runPromise(hash("rahasia"))).toBe("$2b$12$abc");
    expect(calls).toEqual([{ cmd: "hash_password", args: { password: "rahasia" } }]);
  });

  test("a failed call is an InvokeError, not a credential refusal", async () => {
    outcome = { kind: "error", error: new Error("missing command") };

    const result = await Effect.runPromise(Effect.either(hash("rahasia")));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left._tag).toBe("InvokeError");
  });
});

describe("verify", () => {
  test("matching password resolves", async () => {
    expect(await Effect.runPromise(verify("rahasia", "$2b$12$abc"))).toBeUndefined();
    expect(calls).toEqual([
      { cmd: "verify_password", args: { password: "rahasia", hash: "$2b$12$abc" } },
    ]);
  });

  test("a wrong password is an InvalidCredential with the form's sentence", async () => {
    outcome = { kind: "value", value: false };

    const result = await Effect.runPromise(Effect.either(verify("salah", "$2b$12$abc")));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("InvalidCredential");
      expect(result.left.message).toBe("Kata sandi salah");
    }
  });

  test("a broken app is an InvokeError, so the form does not blame the password", async () => {
    outcome = { kind: "error", error: new Error("missing command") };

    const result = await Effect.runPromise(Effect.either(verify("rahasia", "$2b$12$abc")));

    expect(result._tag === "Left" && result.left._tag).toBe("InvokeError");
  });
});

describe("Unauthenticated", () => {
  test("is an Error, so the router's boundary can match it", async () => {
    const { Unauthenticated } = await import("./auth");
    expect(new Unauthenticated("belum masuk")).toBeInstanceOf(Error);
  });
});
