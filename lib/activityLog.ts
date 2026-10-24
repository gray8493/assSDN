// Server helper for the team audit trail (bonus feature).
// Never breaks the main operation – logging failures are swallowed.

import { prisma } from "@/lib/prisma";

export const ACTIVITY_ACTIONS = {
  TEAM_UPDATED: "TEAM_UPDATED",
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  ROLE_CHANGED: "ROLE_CHANGED",
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_DELETED: "TASK_DELETED",
} as const;

export interface LogActivityInput {
  teamId: string;
  userId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
}

export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        teamId: input.teamId,
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (error) {
    console.error("logActivity failed:", error);
  }
}
