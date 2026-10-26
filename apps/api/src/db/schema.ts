import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Shared helper: a timestamp column that always stores the time zone
const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

// ---------- Allowed values ----------
export const userRole = pgEnum("user_role", ["staff", "student"]);
export const officeHoursStatus = pgEnum("office_hours_status", ["open", "paused", "closed"]);
export const queueStatus = pgEnum("queue_status", [
  "waiting",
  "called",
  "in_call",
  "done",
  "left",
  "skipped",
]);

// ---------- People: minimal profile, nothing about camera, location or device ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  role: userRole("role").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

// ---------- One row per office hours session ----------
export const officeHours = pgTable("office_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  status: officeHoursStatus("status").notNull().default("open"),
  joinCode: text("join_code").notNull().unique(),
  opensAt: timestamptz("opens_at"),
  closesAt: timestamptz("closes_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

// ---------- Which staff can call students in which session ----------
export const staffMembers = pgTable(
  "staff_members",
  {
    officeHoursId: uuid("office_hours_id")
      .notNull()
      .references(() => officeHours.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.officeHoursId, t.userId] })]
);

// ---------- The queue ----------
export const queueEntries = pgTable(
  "queue_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    officeHoursId: uuid("office_hours_id")
      .notNull()
      .references(() => officeHours.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id),
    status: queueStatus("status").notNull().default("waiting"),
    priority: integer("priority").notNull().default(0), // higher goes first (e.g. first visit this week)
    joinedAt: timestamptz("joined_at").notNull().defaultNow(),
    calledAt: timestamptz("called_at"),
    calledBy: uuid("called_by").references(() => users.id),
    noShowCount: integer("no_show_count").notNull().default(0),
    question: text("question"), // staff-only; never logged
  },
  (t) => [
    // A student can only be in a session's queue once at a time
    uniqueIndex("queue_entries_one_active_per_student")
      .on(t.officeHoursId, t.studentId)
      .where(sql`${t.status} in ('waiting', 'called', 'in_call')`),
    // Makes "find the next waiting student" fast, in exactly the order Call next uses
    index("queue_entries_next_waiting")
      .on(t.officeHoursId, t.priority.desc(), t.joinedAt)
      .where(sql`${t.status} = 'waiting'`),
  ]
);

// ---------- Transactional outbox: events written with the queue change, sent later ----------
export const outbox = pgTable(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(), // increasing, so events keep their order
    kind: text("kind").notNull(), // e.g. "student_called"
    payload: jsonb("payload").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    sentAt: timestamptz("sent_at"), // null until the worker sends it
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => [index("outbox_unsent").on(t.createdAt).where(sql`${t.sentAt} is null`)]
);

// ---------- Idempotency: the first result of each Call next click, replayed on retries ----------
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  response: jsonb("response").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});