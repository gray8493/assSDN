// Central permission module – pure functions only (no Prisma / no server deps)
// so it can be imported by both UI components and API route handlers.
// Server ALWAYS enforces permissions; UI uses this module only to hide/disable.

export const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** OWNER and ADMIN have management rights over members/tasks */
export function isAdminLevel(role: Role | null | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function roleRank(role: Role): number {
  return role === "OWNER" ? 2 : role === "ADMIN" ? 1 : 0;
}

export type PermissionAction =
  // Team
  | "team.view"
  | "team.update" // rename / team settings
  | "team.delete" // delete whole team
  // Members
  | "member.view"
  | "member.add" // invite new member
  | "member.remove" // remove a member (target rules checked separately)
  | "member.role.update" // change a member's role (target rules checked separately)
  // Tasks
  | "task.view"
  | "task.create"
  | "task.update.own" // own tasks = created by user or assigned to user
  | "task.delete.own"
  | "task.update.any"
  | "task.delete.any";

// Basic role → action matrix. Finer-grained target rules (e.g. ADMIN vs OWNER
// target, last-owner guard, assignee scope) live in canRemoveMember/canSetRole/
// canModifyTask/canAssignTo below.
const MATRIX: Record<PermissionAction, readonly (Role | null)[]> = {
  "team.view": ROLES,
  "team.update": ["OWNER"],
  "team.delete": ["OWNER"],

  "member.view": ROLES,
  "member.add": ["OWNER", "ADMIN"],
  "member.remove": ["OWNER", "ADMIN"],
  "member.role.update": ["OWNER", "ADMIN"],

  "task.view": ROLES,
  "task.create": ROLES,
  "task.update.own": ROLES,
  "task.delete.own": ROLES,
  "task.update.any": ["OWNER", "ADMIN"],
  "task.delete.any": ["OWNER", "ADMIN"],
};

export function can(role: Role | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  return MATRIX[action].includes(role);
}

/** A task is "own" if the user created it or is its assignee */
export function isOwnTask(
  task: { creatorId?: string | null; assigneeId?: string | null },
  userId: string
): boolean {
  return task.creatorId === userId || task.assigneeId === userId;
}

export function canModifyTask(
  role: Role | null | undefined,
  task: { creatorId?: string | null; assigneeId?: string | null },
  userId: string
): boolean {
  if (!role) return false;
  if (can(role, "task.update.any")) return true;
  return can(role, "task.update.own") && isOwnTask(task, userId);
}

export function canDeleteTask(
  role: Role | null | undefined,
  task: { creatorId?: string | null; assigneeId?: string | null },
  userId: string
): boolean {
  if (!role) return false;
  if (can(role, "task.delete.any")) return true;
  return can(role, "task.delete.own") && isOwnTask(task, userId);
}

/** MEMBER can only assign tasks to themselves (or leave unassigned) */
export function canAssignTo(
  role: Role | null | undefined,
  assigneeId: string | null | undefined,
  actorId: string
): boolean {
  if (!assigneeId) return true;
  if (isAdminLevel(role)) return true;
  return assigneeId === actorId;
}

export const MANAGE_ROLE_UI_REASON = "You don't have permission to manage this member";

/** Result of a role-management check, with a human-readable reason for UI */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Can actor change target's role to newRole?
 * Rules enforced server-side, mirrored here for UI:
 * - OWNER/ADMIN only (basic)
 * - ADMIN can never act on an OWNER, nor grant/revoke the OWNER role
 * - OWNER can change other owners but the team must keep >= 1 OWNER
 *   (ownerCount = number of OWNER memberships BEFORE the change)
 */
export function canSetRole(
  actorRole: Role | null | undefined,
  targetRole: Role,
  newRole: Role,
  ownerCount: number
): PermissionCheckResult {
  if (!can(actorRole, "member.role.update")) {
    return { allowed: false, reason: "Only Owner and Admin can change roles" };
  }
  if (targetRole === "OWNER" && actorRole !== "OWNER") {
    return { allowed: false, reason: "Admin cannot modify the Owner's role" };
  }
  if (newRole === "OWNER" && actorRole !== "OWNER") {
    return { allowed: false, reason: "Admin cannot promote anyone to Owner" };
  }
  if (
    targetRole === "OWNER" &&
    newRole !== "OWNER" &&
    ownerCount <= 1
  ) {
    return {
      allowed: false,
      reason: "Team must keep at least one Owner",
    };
  }
  return { allowed: true };
}

/**
 * Can actor remove target from the team?
 * - OWNER/ADMIN only (basic)
 * - Neither level can remove a member with the OWNER role
 *   (keeps "at least one owner" invariant simple)
 * - Actor cannot remove themselves (no leave-team flow)
 */
export function canRemoveMember(
  actorRole: Role | null | undefined,
  targetRole: Role,
  isSelf: boolean
): PermissionCheckResult {
  if (!can(actorRole, "member.remove")) {
    return { allowed: false, reason: "Only Owner and Admin can remove members" };
  }
  if (isSelf) {
    return { allowed: false, reason: "You cannot remove yourself from the team" };
  }
  if (targetRole === "OWNER") {
    return { allowed: false, reason: "The team Owner cannot be removed" };
  }
  return { allowed: true };
}

/** Compact matrix used to render the "What each role can do" UI panel */
export const ROLE_CAPABILITIES: { role: Role; capabilities: string[] }[] = [
  {
    role: "OWNER",
    capabilities: [
      "Full access to the team",
      "Manage members and change any role",
      "Delete the team",
      "Create, edit and delete any task",
    ],
  },
  {
    role: "ADMIN",
    capabilities: [
      "Manage members (add/remove, change MEMBER roles)",
      "Cannot delete the team or change/remove the OWNER",
      "Create, edit and delete any task",
    ],
  },
  {
    role: "MEMBER",
    capabilities: [
      "Create tasks and manage their own tasks",
      "View all team tasks, chat, and members",
    ],
  },
];
