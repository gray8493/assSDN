// Shared (client + server) naming conventions for Supabase Realtime channels
// and broadcast events. Keep in sync with lib/realtime.ts (server sender) and
// client components (subscribers).

export const TEAM_CHANNEL = (teamId: string) => `team:${teamId}`;
export const USER_CHANNEL = (userId: string) => `user:${userId}`;

export const EVENTS = {
  // Chat
  MESSAGE_NEW: "message.new",

  // Task board
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_DELETED: "task.deleted",

  // Notifications (user channel)
  NOTIFICATION_NEW: "notification.new",

  // Chat extra (typing / presence – bonus features)
  TYPING: "typing",
} as const;
