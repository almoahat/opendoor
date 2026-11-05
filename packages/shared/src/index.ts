import { z } from "zod";

// ---------- Queue entry statuses (mirror the database enum) ----------
export const QueueEntryStatus = z.enum(["waiting", "called", "in_call", "done", "left", "skipped"]);
export type QueueEntryStatus = z.infer<typeof QueueEntryStatus>;

// ---------- POST /office-hours/:joinCode/queue ----------
export const JoinQueueRequest = z.object({
  // Optional, visible to staff only. Trimmed, and capped so nobody pastes an essay.
  question: z.string().trim().max(500).optional(),
});
export type JoinQueueRequest = z.infer<typeof JoinQueueRequest>;

// ---------- What the API returns for a student's own queue entry ----------
export const QueueEntryResponse = z.object({
  id: z.string(),
  status: QueueEntryStatus,
  position: z.number().int().nullable(), // 1 = next up; null once no longer waiting
  joinedAt: z.string(), // ISO date-time
});
export type QueueEntryResponse = z.infer<typeof QueueEntryResponse>;