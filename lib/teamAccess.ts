// Server-only helpers for resolving team membership/roles.
// Pure permission rules live in lib/permissions.ts (shared with the UI);
// anything that touches Prisma lives here.

import { prisma } from "@/lib/prisma";
import {
  type Role,
  isRole,
  canSetRole,
  type PermissionCheckResult,
} from "@/lib/permissions";

type TeamMemberRow = { id: string; userId: string; role: string };

type TeamWithMembers = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  members: TeamMemberRow[];
};

export type TeamAccessResult =
  | { ok: true; team: TeamWithMembers; role: Role }
  | { ok: false; status: 404 | 403 };

/**
 * Load a team and resolve the user's role in it.
 * NOT_FOUND when the team does not exist, FORBIDDEN when the user is not a
 * member. Back-compat: if no membership row exists we still treat the team's
 * ownerId user as OWNER.
 */
export async function loadTeamAccess(
  userId: string,
  teamId: string
): Promise<TeamAccessResult> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: { id: true, userId: true, role: true },
      },
    },
  });
  if (!team) return { ok: false, status: 404 };

  const membership = team.members.find((m) => m.userId === userId);
  const role: Role | null = membership
    ? isRole(membership.role)
      ? membership.role
      : "MEMBER"
    : team.ownerId === userId
      ? "OWNER"
      : null;

  if (!role) return { ok: false, status: 403 };
  return { ok: true, team: team as TeamWithMembers, role };
}

/**
 * Count OWNER memberships in a team (used for the "always keep at least one
 * OWNER" guard before demoting one). Pass-before-change semantics: call BEFORE
 * applying the update, when the target is currently an OWNER.
 */
export async function countOwnerMembers(teamId: string): Promise<number> {
  return prisma.teamMember.count({ where: { teamId, role: "OWNER" } });
}

/**
 * Validate a proposed role change (targetRow already loaded), enforcing:
 * ADMIN cannot act on OWNER rows / grant OWNER, and the last OWNER cannot be
 * demoted. Returns the validated target role for the route to use.
 */
export async function checkSetRole(
  actorRole: Role,
  targetRole: Role,
  newRole: unknown,
  teamId: string
): Promise<PermissionCheckResult & { newRole: Role }> {
  const normalized: Role = isRole(newRole) ? newRole : "MEMBER";
  const ownerCount =
    targetRole === "OWNER" && normalized !== "OWNER"
      ? await countOwnerMembers(teamId)
      : 1;
  const result = canSetRole(actorRole, targetRole, normalized, ownerCount);
  return { ...result, newRole: normalized };
}
