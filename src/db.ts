import { type Client, createClient } from "@libsql/client/web";
import type { EventInput } from "./schema";

export function createDB(url: string, authToken: string): Client {
  return createClient({ url, authToken });
}

export async function insertEvent(
  db: Client,
  event: EventInput,
  ipHash: string,
  pluginVersion: string,
) {
  await db.execute({
    sql: `INSERT INTO events (
      ip_hash, plugin_version, device_id, outcome,
      file_ext, language,
      prefix_length, trimmed_prefix_length, line_count, relative_position,
      after_cursor_ws, last_char, last_nonws_char, indentation_level,
      completion_lines, completion_additions, completion_deletions,
      completion_source, manually_triggered, provider,
      stage_index, cursor_target_distance, is_prefetched,
      display_duration_ms, time_since_last_edit_ms,
      typing_speed, recent_actions, has_diagnostics, treesitter_scope,
      edit_count, predicted_edit_ratio, completions_since_accept
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )`,
    args: [
      ipHash,
      pluginVersion,
      event.device_id,
      event.outcome,
      event.file_ext,
      event.language,
      event.prefix_length,
      event.trimmed_prefix_length,
      event.line_count,
      event.relative_position,
      event.after_cursor_ws ? 1 : 0,
      event.last_char,
      event.last_nonws_char,
      event.indentation_level,
      event.completion_lines,
      event.completion_additions,
      event.completion_deletions,
      event.completion_source,
      event.manually_triggered ? 1 : 0,
      event.provider,
      event.stage_index,
      event.cursor_target_distance,
      event.is_prefetched ? 1 : 0,
      event.display_duration_ms,
      event.time_since_last_edit_ms,
      event.typing_speed,
      JSON.stringify(event.recent_actions),
      event.has_diagnostics ? 1 : 0,
      event.treesitter_scope,
      event.edit_count,
      event.predicted_edit_ratio,
      event.completions_since_accept,
    ],
  });
}

export async function queryEvents(
  db: Client,
  opts: { limit: number; offset: number; device_id?: string; outcome?: string },
) {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (opts.device_id) {
    conditions.push("device_id = ?");
    args.push(opts.device_id);
  }
  if (opts.outcome) {
    conditions.push("outcome = ?");
    args.push(opts.outcome);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM events ${where}`,
    args,
  });
  const total = Number(countResult.rows[0].total);

  const result = await db.execute({
    sql: `SELECT * FROM events ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    args: [...args, opts.limit, opts.offset],
  });

  return { rows: result.rows, total };
}
