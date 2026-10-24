import { createHmac } from "node:crypto";

const key = process.env.ZOOM_SDK_KEY;
const secret = process.env.ZOOM_SDK_SECRET;
if (!key || !secret) {
  console.error("Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET in apps/api/.env");
  process.exit(1);
}

// Usage: video-token.ts <session name> <role: 1 = host, 0 = participant>
const topic = process.argv[2] ?? "opendoor-spike";
const role = Number(process.argv[3] ?? 1);

const iat = Math.floor(Date.now() / 1000) - 30; // small buffer for clock drift
const exp = iat + 2 * 60 * 60; // valid for 2 hours

const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const header = encode({ alg: "HS256", typ: "JWT" });
const payload = encode({ app_key: key, tpc: topic, role_type: role, version: 1, iat, exp });
const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");

console.log(`${header}.${payload}.${signature}`);