import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { loadTeamAccess } from "@/lib/teamAccess";
import { can } from "@/lib/permissions";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

// GET /api/teams/:id/members – List team members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isMember =
      team.ownerId === authUser.id ||
      team.members.some((m) => m.userId === authUser.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "Forbidden: You are not a member of this team" },
        { status: 403 }
      );
    }

    return NextResponse.json(team.members);
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/members – Add a member to a team (OWNER & ADMIN only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await params;
    const access = await loadTeamAccess(authUser.id, teamId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 404 ? "Team not found" : "Forbidden: You are not a member of this team" },
        { status: access.status }
      );
    }

    if (!can(access.role, "member.add")) {
      return NextResponse.json(
        { error: "Forbidden: Only the team owner and admins can add members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = "MEMBER" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Member email is required" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: `User with email "${email}" does not exist in the system` },
        { status: 404 }
      );
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this team" },
        { status: 400 }
      );
    }

    const memberRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: targetUser.id,
        role: memberRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify the added user (never notify the actor themselves)
    if (targetUser.id !== authUser.id) {
      await createNotification({
        userId: targetUser.id,
        type: NOTIFICATION_TYPES.TEAM_ADDED,
        message: `${access.team.name}: You were added to the team as ${memberRole.toLowerCase()}`,
        link: `/teams/${teamId}`,
        refId: teamId,
      });
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Add team member error:", error);
    return NextResponse.json(
      { error: "Failed to add team member" },
      { status: 500 }
    );
  }
}
