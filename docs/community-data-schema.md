# Community Data Collection Schema

Anonymous completion metrics collected with opt-in consent for training an
improved completion gating model. **No code content, no file paths, nothing
identifying.**

## Schema

```json
{
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "outcome": "accepted",
  "file_ext": ".go",
  "language": "go",
  "prefix_length": 15,
  "trimmed_prefix_length": 13,
  "line_count": 210,
  "relative_position": 0.14,
  "after_cursor_ws": false,
  "last_char": ")",
  "last_nonws_char": ")",
  "indentation_level": 8,
  "prev_filter_shown": true,
  "filter_score": 0.72,
  "completion_lines": 3,
  "completion_additions": 3,
  "completion_deletions": 0,
  "completion_source": "typing",
  "manually_triggered": false,
  "provider": "sweepapi",
  "stage_index": 0,
  "cursor_target_distance": 12,
  "is_prefetched": false,
  "display_duration_ms": 1200,
  "time_since_last_decision_ms": 4500,
  "time_since_last_edit_ms": 800,
  "typing_speed": 4.2,
  "recent_actions": ["IC", "IC", "IC", "DC", "IC"],
  "has_diagnostics": false,
  "treesitter_scope": "function",
  "edit_count": 18,
  "predicted_edit_ratio": 0.33,
  "completions_since_accept": 3
}
```

## API Payload

The client sends the following JSON body to `POST /events`. Server-side fields
(`id`, `created_at`, `ip_hash`, `plugin_version`) are derived on ingestion —
`plugin_version` is sent as a header.

## Field Reference

| Field                         | Type       | Source | Description                                                                                                                                                                           |
| ----------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | `int`      | server | Auto-increment primary key                                                                                                                                                            |
| `created_at`                  | `string`   | server | ISO 8601 UTC timestamp when the event was received                                                                                                                                    |
| `ip_hash`                     | `string`   | server | SHA-256 hash of the client IP (for rate limiting and anomaly detection, not identifying)                                                                                              |
| `plugin_version`              | `string`   | header | Plugin version that sent the event (e.g. `"0.5.0"`)                                                                                                                                   |
| `device_id`                   | `string`   | client | Persistent UUID4 generated once per install                                                                                                                                           |
| `outcome`                     | `string`   | client | Completion result: `"accepted"`, `"rejected"`, or `"ignored"`                                                                                                                         |
| `file_ext`                    | `string`   | client | Lowercase file extension including dot (e.g. `".go"`, `".ts"`)                                                                                                                        |
| `language`                    | `string`   | client | Resolved language identifier (e.g. `"go"`, `"typescript"`, `"unknown"`)                                                                                                               |
| `prefix_length`               | `int`      | client | Length of the text on the current line before the cursor (byte offset within line)                                                                                                    |
| `trimmed_prefix_length`       | `int`      | client | Length of the prefix with trailing whitespace removed                                                                                                                                 |
| `line_count`                  | `int`      | client | Total number of lines in the document                                                                                                                                                 |
| `relative_position`           | `float`    | client | Normalized cursor position in the document (`0.0` = top, `1.0` = bottom)                                                                                                              |
| `after_cursor_ws`             | `bool`     | client | Whether all text after the cursor on the current line is whitespace (or cursor is at EOL)                                                                                             |
| `last_char`                   | `string`   | client | Last character of the prefix, or `""` if the prefix is empty                                                                                                                          |
| `last_nonws_char`             | `string`   | client | Last non-whitespace character of the prefix, or `""` if none                                                                                                                          |
| `indentation_level`           | `int`      | client | Number of leading whitespace characters on the current line                                                                                                                           |
| `prev_filter_shown`           | `bool`     | client | Whether the previous contextual filter invocation resulted in showing a completion                                                                                                    |
| `filter_score`                | `float`    | client | Score from the current contextual filter model (`0.0`-`1.0`)                                                                                                                          |
| `completion_lines`            | `int`      | client | Number of lines in the completion suggestion                                                                                                                                          |
| `completion_additions`        | `int`      | client | Number of lines added by the completion                                                                                                                                               |
| `completion_deletions`        | `int`      | client | Number of lines deleted/replaced by the completion                                                                                                                                    |
| `completion_source`           | `string`   | client | What triggered the completion: `"typing"` or `"idle"`                                                                                                                                 |
| `manually_triggered`          | `bool`     | client | Whether the user explicitly triggered the completion (keybind) vs. automatic                                                                                                          |
| `provider`                    | `string`   | client | Which provider generated the completion (e.g. `"sweepapi"`, `"copilot"`, `"mercuryapi"`)                                                                                              |
| `stage_index`                 | `int`      | client | Which stage of a multi-stage completion (`0` for single-stage or the first stage)                                                                                                     |
| `cursor_target_distance`      | `int`      | client | Lines between the cursor and the completion target (`0` when no navigation needed)                                                                                                    |
| `is_prefetched`               | `bool`     | client | Whether the completion was speculatively prefetched ahead of the user arriving at the target                                                                                          |
| `display_duration_ms`         | `int`      | client | Milliseconds the completion was visible before the user acted (analytics only — not a gating model input)                                                                             |
| `time_since_last_decision_ms` | `int`      | client | Milliseconds since the last accept/reject/suppress decision                                                                                                                           |
| `time_since_last_edit_ms`     | `int`      | client | Milliseconds since the most recent edit in the current file                                                                                                                           |
| `typing_speed`                | `float`    | client | Average typing speed (chars/sec) over the ~3 seconds preceding the completion trigger                                                                                                 |
| `recent_actions`              | `string[]` | client | Last 5 user actions before the completion trigger. Values: `"IC"` (insert char), `"IS"` (insert selection), `"DC"` (delete char), `"DS"` (delete selection), `"CM"` (cursor movement) |
| `has_diagnostics`             | `bool`     | client | Whether the file has active LSP diagnostics (errors or warnings)                                                                                                                      |
| `treesitter_scope`            | `string`   | client | Enclosing AST scope: `"function"`, `"class"`, `"top_level"`, `"string"`, `"comment"`, or `"other"`                                                                                    |
| `edit_count`                  | `int`      | client | Total number of diff entries in the current file's session history                                                                                                                    |
| `predicted_edit_ratio`        | `float`    | client | Ratio of AI-accepted edits (`predicted`) to total edits in the current file (`0.0`-`1.0`)                                                                                             |
| `completions_since_accept`    | `int`      | client | Number of completions shown (and not accepted) since the last accept                                                                                                                  |
