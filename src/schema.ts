import { z } from "zod";

const outcomeEnum = z.enum(["accepted", "rejected", "ignored"]);
const completionSourceEnum = z.enum(["typing", "idle"]);
const treesitterScopeEnum = z.enum([
  "function",
  "class",
  "top_level",
  "string",
  "comment",
  "other",
]);
const actionEnum = z.enum(["IC", "IS", "DC", "DS", "CM"]);

export const eventSchema = z.object({
  device_id: z.string().uuid(),
  outcome: outcomeEnum,

  // File context
  file_ext: z.string().max(20),
  language: z.string().max(30),

  // Cursor context
  prefix_length: z.int().nonnegative(),
  trimmed_prefix_length: z.int().nonnegative(),
  line_count: z.int().positive(),
  relative_position: z.number().min(0).max(1),
  after_cursor_ws: z.boolean(),
  last_char: z.string().max(1),
  last_nonws_char: z.string().max(1),
  indentation_level: z.int().nonnegative(),

  // Completion properties
  completion_lines: z.int().nonnegative(),
  completion_additions: z.int().nonnegative(),
  completion_deletions: z.int().nonnegative(),
  completion_source: completionSourceEnum,
  manually_triggered: z.boolean(),
  provider: z.string().max(30),

  // Staging & cursor prediction
  stage_index: z.int().nonnegative(),
  cursor_target_distance: z.int().nonnegative(),
  is_prefetched: z.boolean(),

  // Timing
  display_duration_ms: z.int().nonnegative(),
  time_since_last_edit_ms: z.int().nonnegative(),
  typing_speed: z.number().nonnegative(),

  // Session context
  recent_actions: z.array(actionEnum).max(5),
  has_diagnostics: z.boolean(),
  treesitter_scope: treesitterScopeEnum,
  edit_count: z.int().nonnegative(),
  predicted_edit_ratio: z.number().min(0).max(1),
  completions_since_accept: z.int().nonnegative(),
});

export type EventInput = z.input<typeof eventSchema>;
