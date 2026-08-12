/**
 * Applies a migration file straight to the database.
 *
 *   node scripts/migrate.mjs supabase/migrations/0005_game_engine.sql
 *   node scripts/migrate.mjs --all
 *
 * Why this exists: 0001–0004 were pasted into the Supabase SQL editor by
 * hand, and 0003 is the reason that's a bad idea — the editor reported
 * "Success. No rows returned." for a migration whose policies had silently
 * not applied. Running the file as one transaction means a failure anywhere
 * rolls the whole thing back and prints the actual Postgres error.
 *
 * Needs SUPABASE_DB_URL in .env.local (gitignored). Get it from
 * Supabase → Project Settings → Database → Connection string → URI, and
 * URL-encode any special characters in the password.
 */
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
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

const url = env.SUPABASE_DB_URL;
if (!url) {
  console.error("\n  SUPABASE_DB_URL missing from .env.local\n");
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  console.error("\n  usage: node scripts/migrate.mjs <file.sql> | --all\n");
  process.exit(1);
}

const files =
  arg === "--all"
    ? readdirSync(path.join(root, "supabase/migrations"))
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => path.join("supabase/migrations", f))
    : [arg];

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("");

for (const file of files) {
  const sql = readFileSync(path.join(root, file), "utf8");
  process.stdout.write(`  ${path.basename(file)} … `);
  try {
    // One transaction per file: a migration that fails halfway leaves the
    // schema in a state no later file expects, which is exactly how 0003
    // managed to half-apply.
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("\x1b[32mok\x1b[0m");
  } catch (err) {
    await client.query("rollback");
    console.log("\x1b[31mfailed\x1b[0m");
    console.log(`\n  ${err.message}\n`);
    if (err.position) {
      const upto = sql.slice(0, Number(err.position));
      console.log(`  at line ${upto.split("\n").length}\n`);
    }
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("");
