import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const { db, close } = createDb(databaseUrl);
const app = createApp({ db });
const port = Number(process.env.PORT ?? 4000);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});

// On Ctrl+C locally, or SIGTERM when ECS stops the task:
// stop taking requests, then close the database connections
const shutdown = () => {
  server.close(() => {
    void close().then(() => process.exit(0));
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);