/**
 * Health + security check against the real Supabase project.
 *
 * Verifies, in order:
 *   1. the project is reachable
 *   2. the migration has run (players table exists, seeded with six)
 *   3. anonymous sign-in is switched on
 *   4. THE IMPORTANT ONE — a second anonymous user cannot read the first
 *      user's survey answers
 *
 * It prints pass/fail only. It never prints answer content, by design:
 * it writes a marker string and asserts on the row count, not the value.
 *
 * Run with `node scripts/check.mjs`.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Minimal .env.local reader — avoids adding dotenv for one script.
const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let failures = 0;
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const fail = (m, d) => {
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  if (d) console.log(`    \x1b[2m${d}\x1b[0m`);
};

const anon = () =>
  createClient(URL_, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

console.log("\nCommutation — checking Supabase\n");

// 1 ─ reachable + migration run ──────────────────────────────────────────
const probe = anon();
const { data: players, error: playersErr } = await probe
  .from("players")
  .select("id,name,answers_count")
  .order("sort_order");

if (playersErr) {
  fail("players table readable", playersErr.message);
  console.log(
    "\n  → Run supabase/migrations/0001_stage1_survey.sql in the SQL Editor.\n",
  );
  process.exit(1);
}
pass(`players table readable (${players.length} rows)`);

if (players.length === 6) pass(`seeded: ${players.map((p) => p.name).join(", ")}`);
else fail(`expected 6 players, found ${players.length}`);

// 2 ─ anonymous sign-in enabled ──────────────────────────────────────────
const a = anon();
const { data: signA, error: signErrA } = await a.auth.signInAnonymously();
if (signErrA) {
  fail("anonymous sign-in", signErrA.message);
  console.log(
    "\n  → Supabase → Authentication → Sign In / Providers → Anonymous sign-ins → ON\n",
  );
  process.exit(1);
}
pass("anonymous sign-in works");
const uidA = signA.user.id;

// 3 ─ claim + write ──────────────────────────────────────────────────────
const target = players.find((p) => p.id === "choolwe");
const { data: claimed, error: claimErr } = await a
  .from("players")
  .update({ claimed_by: uidA, claimed_at: new Date().toISOString() })
  .eq("id", target.id)
  .is("claimed_by", null)
  .select();

const claimedOk = !claimErr && claimed?.length === 1;
if (claimedOk) pass(`claimed a profile as user A`);
else fail("claim a profile", claimErr?.message ?? "already claimed — reset below");

const MARKER = `__rls_probe_${Date.now()}__`;
if (claimedOk) {
  const { error: insErr } = await a.from("survey_responses").insert({
    player_id: target.id,
    section_id: "confessions",
    question_id: "__rls_probe__",
    answer_index: 0,
    value: MARKER,
  });
  if (insErr) fail("write own answer", insErr.message);
  else pass("write own answer");

  const { data: own } = await a
    .from("survey_responses")
    .select("id")
    .eq("question_id", "__rls_probe__");
  if (own?.length === 1) pass("read own answer back");
  else fail("read own answer back", `got ${own?.length ?? 0} rows`);
}

// 4 ─ THE IMPORTANT ONE ──────────────────────────────────────────────────
const b = anon();
const { error: signErrB } = await b.auth.signInAnonymously();
if (signErrB) {
  fail("second anonymous user", signErrB.message);
} else {
  const { data: leaked, error: readErr } = await b
    .from("survey_responses")
    .select("id,value");

  if (readErr) {
    pass(`user B blocked from survey_responses (${readErr.code})`);
  } else if ((leaked?.length ?? 0) === 0) {
    pass("user B reads ZERO of user A's answers — RLS holds");
  } else {
    fail(
      `USER B READ ${leaked.length} ROW(S) THAT AREN'T THEIRS — RLS IS BROKEN`,
    );
  }

  // The roster must stay readable: it's what drives the "who's done" list.
  const { data: rosterB, error: rosterErr } = await b
    .from("players")
    .select("id,answers_count");
  if (!rosterErr && rosterB?.length === 6)
    pass("user B can still see the roster + counts (by design)");
  else fail("user B can read roster", rosterErr?.message);

  // And must not be able to write into someone else's profile.
  const { data: hijack } = await b
    .from("survey_responses")
    .insert({
      player_id: target.id,
      section_id: "confessions",
      question_id: "__hijack__",
      answer_index: 0,
      value: "x",
    })
    .select();
  if (!hijack || hijack.length === 0)
    pass("user B blocked from writing into user A's profile");
  else fail("USER B WROTE INTO ANOTHER PLAYER'S PROFILE");

  await b.auth.signOut();
}

// 4b ─ the inherited-row bug ─────────────────────────────────────────────
// A row written by an earlier session must still be writable by whoever
// holds the profile now. This is what broke silently before 0004: Safari
// clearing localStorage would leave someone unable to save, with no error.
{
  const c = anon();
  const { data: signC } = await c.auth.signInAnonymously();
  if (signC) {
    const { error: takeErr } = await c.rpc("claim_profile", { p_id: target.id });
    if (takeErr) {
      fail("take over a profile", takeErr.message);
    } else {
      const { error: saveErr } = await c.rpc("save_answer", {
        p_player_id: target.id,
        p_section_id: "logistics",
        p_question_id: "__rls_probe__",
        p_answer_index: 0,
        p_value: "written after takeover",
      });
      if (saveErr) fail("write over an inherited row", saveErr.message);
      else pass("write over a row left by a previous session");

      const { data: seen } = await c
        .from("survey_responses")
        .select("id")
        .eq("question_id", "__rls_probe__");
      if ((seen?.length ?? 0) === 1)
        pass("new holder reads back only their own write");
      else fail("read back after takeover", `got ${seen?.length ?? 0} rows`);

      await c.rpc("save_answer", {
        p_player_id: target.id,
        p_section_id: "logistics",
        p_question_id: "__rls_probe__",
        p_answer_index: 0,
        p_value: "",
      });
      const { data: gone } = await c
        .from("survey_responses")
        .select("id")
        .eq("question_id", "__rls_probe__");
      if ((gone?.length ?? 0) === 0) pass("blanking a field deletes the row");
      else fail("blank should delete", `${gone?.length} left`);

      await c.rpc("release_profile");
    }
    await c.auth.signOut();
  }
}

// 5 ─ clean up ───────────────────────────────────────────────────────────
{
  const z = anon();
  await z.auth.signInAnonymously();
  await z.rpc("claim_profile", { p_id: target.id });
  await z.rpc("save_answer", {
    p_player_id: target.id,
    p_section_id: "logistics",
    p_question_id: "__rls_probe__",
    p_answer_index: 0,
    p_value: "",
  });
  await z.rpc("release_profile");
  await z.auth.signOut();
  pass("cleaned up probe data");
}
await a.auth.signOut();

console.log(
  failures === 0
    ? "\n\x1b[32mAll checks passed.\x1b[0m\n"
    : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
);
process.exit(failures === 0 ? 0 : 1);
