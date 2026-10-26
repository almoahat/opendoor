import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import type { Db } from "./db/client";

// /health never touches the database, so an empty stand-in is enough here
const app = createApp({ db: {} as Db });

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});