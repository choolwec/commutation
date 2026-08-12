/**
 * Behavioural proof that the Stage 2 engine keeps its promises.
 *
 * Every assertion here is one somebody could otherwise break by "tidying up"
 * an RLS policy. They're written as attacks: sign in as an ordinary player
 * and try to see something you shouldn't, then assert the database refused.
 *
 * It prints pass/fail and row counts only — never content. Same discipline as
 * scripts/check.mjs, and for the same reason: a verification script that
 * dumps survey answers to a terminal has broken the thing it's verifying.
 *
 * Setup and teardown use the DB connection directly (service role bypasses
 * RLS, which is the point — it can build a scenario the tests then attack).
 * The six real profiles are never touched: a throwaway seventh player is
 * created and deleted.
 *
 *   node scripts/check-engine.mjs
 */
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

// Deliberately unlike any real crew id, so no cleanup routine could ever
// mistake it for one. See HANDOFF §8 for why that rule exists.
const TEST_PLAYER = "__engine_check__";

let failures = 0;
const pass = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const fail = (m, d) => {
  failures++;
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  if (d) console.log(`    \x1b[2m${d}\x1b[0m`);
};

const db = new Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();

const anon = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

console.log("\nCommutation — game engine checks\n");

let roundId;
let testRoundId;
let realRoundId;
try {
  // ── build a scenario ────────────────────────────────────────────────────
  const player = anon();
  const { data: signIn, error: signErr } = await player.auth.signInAnonymously();
  if (signErr) {
    console.log(`\n  Could not sign in anonymously: ${signErr.message}`);
    console.log("  (Supabase rate-limits this to ~30/hr/IP.)\n");
    process.exit(1);
  }
  const uid = signIn.user.id;

  await db.query(
    `insert into players (id, name, emoji, color, sort_order, claimed_by)
     values ($1, 'Engine Check', '🤖', '#666666', 99, $2)
     on conflict (id) do update set claimed_by = excluded.claimed_by`,
    [TEST_PLAYER, uid],
  );

  const r = await db.query(
    `insert into rounds (game, hall, phase) values ('who_wrote_it','vault','play')
     returning id`,
  );
  roundId = r.rows[0].id;

  // A public item everyone should see, and a secret nobody should see yet.
  const item = await db.query(
    `insert into round_items (round_id, idx, kind, content)
     values ($1, 0, 'survey', 'ENGINE CHECK MARKER') returning id`,
    [roundId],
  );
  await db.query(
    `insert into round_secrets (round_id, item_id, idx, author)
     values ($1, $2, 0, 'niza')`,
    [roundId, item.rows[0].id],
  );

  // An item dealt privately to somebody else.
  await db.query(
    `insert into round_items (round_id, idx, kind, content, visible_to)
     values ($1, 0, 'role', 'YOU ARE THE SPY', 'niza')`,
    [roundId],
  );

  // Somebody else's submission and vote.
  await db.query(
    `insert into submissions (round_id, player_id, idx, kind, value)
     values ($1, 'niza', 0, 'answer', 'SOMEONE ELSE ANSWER')`,
    [roundId],
  );
  await db.query(
    `insert into votes (round_id, player_id, idx, value)
     values ($1, 'niza', 0, 'chibesa')`,
    [roundId],
  );

  // ── 1. the headline guarantee ───────────────────────────────────────────
  const secretsBefore = await player
    .from("round_secrets")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId);

  if ((secretsBefore.count ?? 0) === 0) {
    pass("authorship is unreadable before the reveal");
  } else {
    fail(
      "AUTHORSHIP LEAKED BEFORE THE REVEAL",
      `${secretsBefore.count} secret rows visible during phase=play`,
    );
  }

  // ── 2. public items are readable ────────────────────────────────────────
  const pub = await player
    .from("round_items")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId)
    .is("visible_to", null);
  (pub.count ?? 0) === 1
    ? pass("shared round content is readable by players")
    : fail("shared content not readable", `count=${pub.count}`);

  // ── 3. privately-dealt items stay private ───────────────────────────────
  const priv = await player
    .from("round_items")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId)
    .not("visible_to", "is", null);
  (priv.count ?? 0) === 0
    ? pass("another player's private card is invisible (Spyfall holds)")
    : fail("PRIVATE CARD LEAKED", `count=${priv.count}`);

  // ── 4. submissions sealed until the host opens them ─────────────────────
  const subsBefore = await player
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId);
  (subsBefore.count ?? 0) === 0
    ? pass("other players' submissions hidden before reveal")
    : fail("SUBMISSIONS LEAKED", `count=${subsBefore.count}`);

  // ── 5. votes sealed ─────────────────────────────────────────────────────
  const votesBefore = await player
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId);
  (votesBefore.count ?? 0) === 0
    ? pass("other players' votes hidden before reveal")
    : fail("VOTES LEAKED", `count=${votesBefore.count}`);

  // ── 6. the bypass code is not readable by anyone ────────────────────────
  const secretsTable = await player.from("room_secrets").select("key");
  (secretsTable.data?.length ?? 0) === 0
    ? pass("room_secrets (bypass code) unreadable through the API")
    : fail("BYPASS CODE READABLE", `${secretsTable.data.length} rows`);

  // ── 7. a non-host cannot drive the room ─────────────────────────────────
  await db.query(
    `update game_room set host_player = 'choolwe' where id = 'commutation'`,
  );
  const { error: hostErr } = await player.rpc("set_phase", {
    p_round: roundId,
    p_phase: "reveal",
  });
  hostErr
    ? pass("non-host cannot advance the round")
    : fail("NON-HOST ADVANCED THE ROUND", "set_phase succeeded");

  // ── 8. the deal function is unreachable from a client ───────────────────
  const { error: dealErr } = await player.rpc("deal_from_survey", {
    p_round_id: roundId,
    p_question_ids: ["confession"],
    p_limit: 1,
  });
  dealErr
    ? pass("deal_from_survey is not callable by a client")
    : fail("CLIENT CALLED THE DEAL FUNCTION", "this reads sealed answers");

  // ── 9. survey answers still sealed (Stage 1 rule, re-checked) ───────────
  const survey = await player
    .from("survey_responses")
    .select("id", { count: "exact", head: true });
  (survey.count ?? 0) === 0
    ? pass("survey answers still unreadable by another player")
    : fail("SURVEY ANSWERS LEAKED", `count=${survey.count}`);

  // ── 10. the reveal actually works ───────────────────────────────────────
  await db.query(`update rounds set phase = 'reveal' where id = $1`, [roundId]);
  const secretsAfter = await player
    .from("round_secrets")
    .select("id", { count: "exact", head: true })
    .eq("round_id", roundId);
  (secretsAfter.count ?? 0) === 1
    ? pass("authorship becomes readable at the reveal")
    : fail("reveal did not open the secret", `count=${secretsAfter.count}`);

  // ── 11. the vault refuses to open early ─────────────────────────────────
  await db.query(
    `update game_room set unlocked_at = null, host_player = $1 where id = 'commutation'`,
    [TEST_PLAYER],
  );
  const { error: vaultErr } = await player.rpc("start_round", {
    p_game: "who_wrote_it",
    p_hall: "vault",
    p_question_ids: ["confession"],
    p_items: 1,
  });
  vaultErr
    ? pass("vault games refuse to start before the day unlocks")
    : fail("VAULT OPENED EARLY", "start_round succeeded while locked");

  // ── 12. leaderboard is readable ─────────────────────────────────────────
  const board = await player.from("leaderboard").select("id,points");
  (board.data?.length ?? 0) >= 6
    ? pass(`leaderboard readable (${board.data.length} rows)`)
    : fail("leaderboard not readable", board.error?.message);

  // ── 13-17. test mode (migration 0011) ────────────────────────────────────
  // /test lets someone play alone before the day. Its whole safety story is
  // these five properties — checked for real, not just typed and hoped.
  const { data: tRoundId, error: tStartErr } = await player.rpc("start_round", {
    p_game: "who_wrote_it",
    p_hall: "vault",
    p_test: true,
  });
  testRoundId = tRoundId;
  tStartErr
    ? fail("test-mode vault round starts without unlock", tStartErr.message)
    : pass("test-mode vault round starts without unlock");

  const { error: tDealErr } = await player.rpc("deal_test_pair", {
    p_round: testRoundId,
    p_idx: 0,
    p_content: "engine-check fake content",
    p_author: "niza",
  });
  tDealErr
    ? fail("deal_test_pair works on a test round", tDealErr.message)
    : pass("deal_test_pair works on a test round");

  const testSecrets = await player
    .from("round_secrets")
    .select("id", { count: "exact", head: true })
    .eq("round_id", testRoundId);
  (testSecrets.count ?? 0) === 0
    ? pass("a test round's fake author still stays sealed pre-reveal")
    : fail("TEST ROUND LEAKED ITS FAKE AUTHOR EARLY", `count=${testSecrets.count}`);

  const { data: rRoundId } = await player.rpc("start_deck_round", {
    p_game: "fibbage",
    p_hall: "arena",
  });
  realRoundId = rRoundId;
  const { error: guardErr } = await player.rpc("deal_test_pair", {
    p_round: realRoundId,
    p_idx: 0,
    p_content: "should be refused",
  });
  guardErr
    ? pass("deal_test_pair refuses to touch a non-test round")
    : fail("DEAL_TEST_PAIR WORKED ON A REAL ROUND", "fake content could land in real gameplay");

  const { data: cleared, error: clearErr } = await player.rpc("clear_test_rounds");
  clearErr
    ? fail("clear_test_rounds", clearErr.message)
    : pass(`clear_test_rounds removed ${cleared} round(s)`);
  const staleItems = await db.query(
    `select count(*) from round_items where round_id = $1`,
    [testRoundId],
  );
  Number(staleItems.rows[0].count) === 0
    ? pass("clearing a test round cascades to its items too")
    : fail("stray round_items survived clear_test_rounds");
} catch (err) {
  fail("unexpected error", err.message);
} finally {
  // Teardown. Restore the real host and remove every trace of the test.
  if (roundId) {
    await db.query(`delete from rounds where id = $1`, [roundId]);
  }
  if (realRoundId) {
    await db.query(`delete from rounds where id = $1`, [realRoundId]);
  }
  await db.query(`delete from rounds where is_test`);
  await db.query(`delete from scores where player_id = $1`, [TEST_PLAYER]);
  await db.query(`delete from players where id = $1`, [TEST_PLAYER]);
  await db.query(
    `update game_room set host_player = 'choolwe', active_round = null
      where id = 'commutation'`,
  );
  await db.end();
}

console.log(
  failures === 0
    ? "\n  \x1b[32mall engine checks passed\x1b[0m\n"
    : `\n  \x1b[31m${failures} failed\x1b[0m\n`,
);
process.exit(failures === 0 ? 0 : 1);
