// Server helper: persist a Notification then live-push it on the private-ish
// user channel so the recipient's bell badge updates instantly.

import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/realtime";
import { USER_CHANNEL } from "@/lib/channels";

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TEAM_ADDED: "TEAM_ADDED",
  ROLE_CHANGED: "ROLE_CHANGED",
} as const;

export interface CreateNotificationInput {
  userId: string;
  type: string;
  message: string;
  link?: string | null;
  refId?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        link: input.link ?? null,
        refId: input.refId ?? null,
      },
    });

    // Live push so the bell badge increments without refresh.
    broadcastEvent(USER_CHANNEL(input.userId), "notification.new", {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    }).catch(() => undefined);

    return notification;
  } catch (error) {
    // Notifications must never break the main DB operation
    console.error("createNotification failed:", error);
    return null;
  }
}

/** TASK_ASSIGNED convenience wrapper (no self-notification) */
export async function notifyTaskAssigned(opts: {
  assigneeId: string;
  actorId: string;
  actorName: string;
  taskTitle: string;
  teamId?: string | null;
}) {
  if (opts.assigneeId === opts.actorId) return;
  await createNotification({
    userId: opts.assigneeId,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    message: `${opts.actorName} assigned you the task "${opts.taskTitle}"`,
    link: opts.teamId ? `/teams/${opts.teamId}` : "/",
    refId: opts.teamId ?? null,
  });
}
