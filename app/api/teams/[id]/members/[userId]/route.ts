import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { loadTeamAccess, checkSetRole } from "@/lib/teamAccess";
import {
  can,
  canRemoveMember,
  isRole,
  type Role,
} from "@/lib/permissions";
import { logActivity, ACTIVITY_ACTIONS } from "@/lib/activityLog";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

type Params = { params: Promise<{ id: string; userId: string }> };

function membershipRoleToRole(role: string): Role {
  return isRole(role) ? role : "MEMBER";
}

/**
 * PUT /api/teams/:id/members/:userId – Change a member's role
 * OWNER & ADMIN only, with strict target rules:
 * - ADMIN cannot change an OWNER's role and cannot grant the OWNER role
 * - The team must always keep at least one OWNER
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;
    const access = await loadTeamAccess(authUser.id, teamId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? "Team not found" : "Forbidden: You are not a member of this team" },
        { status: access.status }
      );
    }

    if (!can(access.role, "member.role.update")) {
      return NextResponse.json(
        { error: "Forbidden: Only the team owner and admins can change roles" },
        { status: 403 }
      );
    }

    const membership = access.team.members.find((m) => m.userId === targetUserId);
    if (!membership) {
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const targetRole = membershipRoleToRole(membership.role);
    const check = await checkSetRole(
      access.role,
      targetRole,
      body?.role,
      teamId
    );

    if (!check.allowed) {
      return NextResponse.json(
        { error: `Forbidden: ${check.reason}` },
        { status: 403 }
      );
    }

    if (check.newRole === targetRole) {
      return NextResponse.json(
        { error: "Member already has this role" },
        { status: 400 }
      );
    }

    const updated = await prisma.teamMember.update({
      where: { id: membership.id },
      data: { role: check.newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logActivity({
      teamId,
      userId: authUser.id,
      action: ACTIVITY_ACTIONS.ROLE_CHANGED,
      targetType: "MEMBER",
      targetId: targetUserId,
      detail: `changed ${updated.user.name}'s role from ${targetRole} to ${check.newRole}`,
    });

    // Inform the member whose role changed (not for self-changes)
    if (targetUserId !== authUser.id) {
      await createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.ROLE_CHANGED,
        message: `${access.team.name}: Your role was changed to ${check.newRole.toLowerCase()}`,
        link: `/teams/${teamId}`,
        refId: teamId,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Change member role error:", error);
    return NextResponse.json(
      { error: "Failed to change member role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/teams/:id/members/:userId – Remove a member (OWNER & ADMIN only)
 * - ADMIN cannot remove a member whose role >= ADMIN (only MEMBER)
 * - Neither level can remove a member with the OWNER role
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await params;
    const access = await loadTeamAccess(authUser.id, teamId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? "Team not found" : "Forbidden: You are not a member of this team" },
        { status: access.status }
      );
    }

    if (!can(access.role, "member.remove")) {
      return NextResponse.json(
        { error: "Forbidden: Only the team owner and admins can remove members" },
        { status: 403 }
      );
    }

    const membership = access.team.members.find((m) => m.userId === targetUserId);
    if (!membership) {
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 }
      );
    }

    const removeCheck = canRemoveMember(
      access.role,
      membershipRoleToRole(membership.role),
      targetUserId === authUser.id
    );
    if (!removeCheck.allowed) {
      return NextResponse.json(
        { error: `Forbidden: ${removeCheck.reason}` },
        { status: 403 }
      );
    }

    await prisma.teamMember.delete({
      where: { id: membership.id },
    });

    logActivity({
      teamId,
      userId: authUser.id,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
      targetType: "MEMBER",
      targetId: targetUserId,
      detail: `removed ${membership.user.name} from the team`,
    });

    return NextResponse.json({
      message: "Member removed from team successfully",
      teamId,
      userId: targetUserId,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
