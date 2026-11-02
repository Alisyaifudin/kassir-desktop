import { Effect, Stream } from "effect";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useStream } from "~/components/Loader";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { service } from "~/services";
import { SYNC_BASE_URL, type SyncConfig } from "~/services/sync";

/** The only thing left to configure: a token, for the one server this build knows. */
function isConfigured(config: SyncConfig): boolean {
  return config.token.trim() !== "";
}

/** What the last Cek did, rendered inline next to the buttons. */
type CheckResult = { ok: boolean; message: string };

/**
 * The device's sync credential (contract §10).
 *
 * The server address is `SYNC_BASE_URL`, compiled in: one build talks to one
 * backend, so there is nothing to point somewhere else and nothing to get wrong.
 * The token lives in `store.json` under `sync.token` — the same store the cursors
 * use. There is no account and no login: one token protects the whole endpoint,
 * and the desktop is its only participant.
 *
 * The token is rendered as a password field but is not masked in the store: it is
 * a shared secret for a single-tenant endpoint, and hiding it on screen while
 * leaving it in cleartext on disk would be security theatre.
 *
 * `Cek` asks the server (`GET /v2/health`) whether the token in the field works
 * *before* it is saved, so a typo is caught without writing it to disk first.
 * The answer is rendered inline; a failure is the server's own sentence, not a
 * generic "gagal".
 */
export function TokenForm({
  onConfigured,
}: {
  /** Reports whether a token is stored, so the run button can gate on it. */
  onConfigured?: (configured: boolean) => void;
}) {
  const loaded = useQuery(() => Stream.fromEffect(service.sync.config.get()), []);
  const [form, setForm] = useState<SyncConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seed the field once the stored config arrives, without fighting later edits.
  useEffect(() => {
    if (loaded.type === "success" && form === null) {
      setForm(loaded.data);
      onConfigured?.(isConfigured(loaded.data));
    }
  }, [loaded, form, onConfigured]);

  if (form === null) return <Spinner when />;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (form === null) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const outcome = await Effect.runPromise(
      service.sync.config.set(form).pipe(Effect.either),
    );
    setSaving(false);
    if (outcome._tag === "Left") {
      setError(outcome.left.message);
    } else {
      setSaved(true);
      onConfigured?.(isConfigured(form));
    }
  }

  async function verify() {
    if (form === null) return;
    setChecking(true);
    setError(null);
    // The previous answer belongs to the previous token, so it goes before the
    // request rather than sitting there looking current while the new one runs.
    setCheck(null);
    const outcome = await Effect.runPromise(service.sync.check(form.token).pipe(Effect.either));
    setChecking(false);
    if (outcome._tag === "Left") {
      setCheck({ ok: false, message: outcome.left.message });
      return;
    }
    const { status, message } = outcome.right;
    setCheck({
      ok: true,
      message:
        message === "" ? `Server sehat (${status})` : `Server sehat (${status}) — ${message}`,
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Server: <span className="font-mono text-foreground">{SYNC_BASE_URL}</span>
      </p>
      <label className="grid grid-cols-1 gap-1 text-base sm:grid-cols-[140px_1fr] sm:items-center sm:gap-2">
        <span>Token</span>
        <Input
          type="password"
          value={form.token}
          onChange={(event) => {
            const token = event.currentTarget.value;
            setSaved(false);
            // A check is about one token; editing the field invalidates it.
            setCheck(null);
            setForm({ ...form, token });
          }}
          placeholder="kst_…"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={saving}>
          Simpan <Spinner when={saving} />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={verify}
          disabled={checking || form.token.trim() === ""}
        >
          Cek <Spinner when={checking} />
        </Button>
        {saved ? <p className="text-sm text-muted-foreground">Tersimpan</p> : null}
      </div>
      <TextError>{error}</TextError>
      {check === null ? null : (
        <p
          role={check.ok ? "status" : "alert"}
          className={
            check.ok
              ? "flex items-center gap-2 text-sm text-emerald-600"
              : "flex items-center gap-2 text-sm text-red-500"
          }
        >
          {check.ok ? (
            <CircleCheck className="size-4 shrink-0" />
          ) : (
            <CircleAlert className="size-4 shrink-0" />
          )}
          {check.message}
        </p>
      )}
    </form>
  );
}

/** The pull cursor, read once per mount (it only moves while a run is active). */
export function CursorLine() {
  const cursor = useStream(Stream.fromEffect(service.sync.cursor()));
  const value = cursor.type === "success" ? cursor.data : null;
  return (
    <p className="text-sm text-muted-foreground">
      {value === null ? "Belum pernah sinkron" : `Terakhir menerima sampai urutan ${value}`}
    </p>
  );
}
