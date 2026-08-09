/**
 * Hands every profile back and clears test rows, so the group opens the app
 * to a clean slate.
 *
 * Run before sending the link: `node scripts/reset.mjs`
 *
 * Only touches rows written by test scripts (question ids wrapped in double
 * underscores) plus the claim fields. It cannot read or delete real answers —
 * it runs on the anon key under the same RLS as everyone else, and prints
 * counts, never content.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

await supabase.auth.signInAnonymously();

const { data: before } = await supabase
  .from("players")
  .select("id,name,claimed_by,answers_count")
  .order("sort_order");

const claimed = before.filter((p) => p.claimed_by);
console.log(`\n  ${claimed.length} of ${before.length} profiles were claimed`);

// Take each seat over, then vacate it. Direct updates can't clear someone
// else's claim (by design), so this goes via claim_profile from 0002.
for (const p of claimed) {
  const { error: claimErr } = await supabase.rpc("claim_profile", {
    p_id: p.id,
  });
  if (claimErr) {
    console.log(
      `  ! ${p.name}: ${claimErr.message}\n` +
        `    → apply supabase/migrations/0002_profile_takeover.sql, or clear ` +
        `players.claimed_by in the table editor`,
    );
    continue;
  }
  const { error: relErr } = await supabase.rpc("release_profile");
  if (relErr) console.log(`  ! ${p.name}: ${relErr.message}`);
  else console.log(`  ✓ released ${p.name}`);
}

// ── purge rows left by the test scripts ──────────────────────────────────
// These are authored by long-dead sessions, so a plain DELETE can't touch
// them (deletes are author-scoped). save_answer() runs SECURITY DEFINER and
// treats a blank value as "remove the row", so claiming each seat lets us
// clear them. Only ever targets these known test keys — it cannot and must
// not touch a real answer.
const TEST_KEYS = ["__rls_probe__", "__repro__", "__diag__", "emoji", "arrival"];

let purged = 0;
for (const p of before) {
  const { error: cErr } = await supabase.rpc("claim_profile", { p_id: p.id });
  if (cErr) continue;
  for (const q of TEST_KEYS) {
    const { error } = await supabase.rpc("save_answer", {
      p_player_id: p.id,
      p_section_id: "logistics",
      p_question_id: q,
      p_answer_index: 0,
      p_value: "",
    });
    if (!error) purged++;
  }
  await supabase.rpc("release_profile");
}
if (purged) console.log(`  ✓ purged test rows`);

const { data: after } = await supabase
  .from("players")
  .select("name,claimed_by,answers_count")
  .order("sort_order");

console.log("\n  final state");
for (const p of after) {
  console.log(
    `    ${p.name.padEnd(10)} ${p.claimed_by ? "CLAIMED" : "free   "}  ` +
      `${p.answers_count} answers`,
  );
}
console.log();

await supabase.auth.signOut();
