import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

function getD1() {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return binding;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

export async function ensureResultsTable() {
  const d1 = getD1();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS disc_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      team TEXT NOT NULL DEFAULT '',
      d INTEGER NOT NULL,
      i INTEGER NOT NULL,
      s INTEGER NOT NULL,
      c INTEGER NOT NULL,
      dominant TEXT NOT NULL,
      secondary TEXT NOT NULL,
      pace INTEGER NOT NULL,
      focus INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    d1.prepare("CREATE INDEX IF NOT EXISTS disc_results_created_at_idx ON disc_results(created_at)"),
  ]);
}
