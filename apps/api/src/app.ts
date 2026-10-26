import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { Db } from "./db/client";

export function createApp({ db }: { db: Db }) {
  const app = new Hono();

  // Liveness: is the process up? Never touches the database.
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Readiness: can we reach Postgres?
  app.get("/ready", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  return app;
}