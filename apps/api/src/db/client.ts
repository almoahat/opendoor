import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Creates one connection pool for the whole app; call close() on shutdown
export function createDb(url: string) {
  const client = postgres(url, { max: 10 }); // up to 10 connections at once
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

export type Db = ReturnType<typeof createDb>["db"];