import { createDb } from "../src/db/client";
import {
  idempotencyKeys,
  officeHours,
  outbox,
  queueEntries,
  staffMembers,
  users,
} from "../src/db/schema";

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("@localhost:")) {
  console.error("Refusing to seed: DATABASE_URL is not a localhost database.");
  process.exit(1);
}

const { db, close } = createDb(url);

// Start clean, children before parents (local dev only)
await db.delete(idempotencyKeys);
await db.delete(outbox);
await db.delete(queueEntries);
await db.delete(staffMembers);
await db.delete(officeHours);
await db.delete(users);

const [ta] = await db.insert(users).values({ displayName: "Demo TA", role: "staff" }).returning();
const students = await db
  .insert(users)
  .values([
    { displayName: "Student A", role: "student" },
    { displayName: "Student B", role: "student" },
    { displayName: "Student C", role: "student" },
  ])
  .returning();
if (!ta) throw new Error("Seeding the TA failed");

const [session] = await db
  .insert(officeHours)
  .values({ hostId: ta.id, title: "Demo office hours", joinCode: "DEMO" })
  .returning();
if (!session) throw new Error("Seeding the session failed");

await db.insert(staffMembers).values({ officeHoursId: session.id, userId: ta.id });

console.log("Seeded. Join code: DEMO");
console.log(`TA          ${ta.id}`);
for (const s of students) console.log(`${s.displayName.padEnd(11)} ${s.id}`);

await close();