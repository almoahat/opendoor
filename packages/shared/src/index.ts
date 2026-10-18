import { z } from "zod";

export const QueueStatus = z.enum(["waiting", "called", "in_call", "done", "left", "skipped"]);
export type QueueStatus = z.infer<typeof QueueStatus>;
