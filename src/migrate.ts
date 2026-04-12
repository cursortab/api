import type { Client } from "@libsql/client/web";

import migration0001 from "./migrations/0001_initial.sql";
import migration0002 from "./migrations/0002_drop_contextual_filter.sql";

const migrations: { id: number; name: string; sql: string }[] = [
  { id: 1, name: "0001_initial", sql: migration0001 },
  { id: 2, name: "0002_drop_contextual_filter", sql: migration0002 },
];

export async function migrate(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);

  const applied = await db.execute("SELECT id FROM _migrations");
  const appliedIds = new Set(applied.rows.map((r) => Number(r.id)));

  for (const m of migrations) {
    if (appliedIds.has(m.id)) continue;

    for (const stmt of splitStatements(m.sql)) {
      await db.execute(stmt);
    }

    await db.execute({
      sql: "INSERT INTO _migrations (id, name) VALUES (?, ?)",
      args: [m.id, m.name],
    });
  }
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
