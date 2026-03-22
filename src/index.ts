import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { createDB, insertEvent, migrate, queryEvents } from "./db";
import { eventSchema } from "./schema";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  WRITE_LIMITER: RateLimit;
  READ_LIMITER: RateLimit;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

// Auto-migrate on first request per isolate
let migrated = false;
app.use("*", async (c, next) => {
  if (!migrated) {
    const db = createDB(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
    await migrate(db);
    migrated = true;
  }
  await next();
});

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.cause instanceof ZodError) {
      return c.json(
        {
          error: "Validation failed",
          issues: err.cause.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// Rate limit per IP: 200/10s writes, 60/min reads
app.use("*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const limiter =
    c.req.method === "POST" ? c.env.WRITE_LIMITER : c.env.READ_LIMITER;
  const { success } = await limiter.limit({ key: ip });
  if (!success) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  await next();
});

// Reject oversized request bodies (16KB max)
app.use("*", async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && Number(contentLength) > 16_384) {
    return c.json({ error: "Request body too large" }, 413);
  }
  await next();
});

// POST /events — ingest a completion event
app.post(
  "/events",
  zValidator("json", eventSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Validation failed",
          issues: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    }
  }),
  async (c) => {
    const event = c.req.valid("json");
    const ip = c.req.header("cf-connecting-ip") ?? "unknown";
    const ipHash = await hashIP(ip);
    const pluginVersion = c.req.header("x-plugin-version") ?? "unknown";

    const db = createDB(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
    await insertEvent(db, event, ipHash, pluginVersion);

    return c.json({ ok: true }, 201);
  },
);

// GET /events — public paginated read
app.get("/events", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 1000);
  const offset = Math.max(Number(c.req.query("offset") ?? 0), 0);
  const device_id = c.req.query("device_id");
  const outcome = c.req.query("outcome");

  const db = createDB(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
  const { rows, total } = await queryEvents(db, {
    limit,
    offset,
    device_id: device_id ?? undefined,
    outcome: outcome ?? undefined,
  });

  return c.json({ data: rows, total, limit, offset });
});

// GET /stats — basic dataset statistics
app.get("/stats", async (c) => {
  const db = createDB(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
  const result = await db.execute(`
    SELECT
      COUNT(*) as total_events,
      COUNT(DISTINCT device_id) as unique_devices,
      SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END) as accepted,
      SUM(CASE WHEN outcome = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN outcome = 'ignored' THEN 1 ELSE 0 END) as ignored
    FROM events
  `);
  return c.json(result.rows[0]);
});

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default app;
