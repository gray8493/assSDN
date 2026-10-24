import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { loadTeamAccess } from "@/lib/teamAccess";
import { can } from "@/lib/permissions";

// GET /api/teams/:id/activity – Audit trail of the team (members only)
export async function GET(
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

    if (!can(access.role, "team.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activities = await prisma.activityLog.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
