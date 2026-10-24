import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { loadTeamAccess } from "@/lib/teamAccess";
import { can, canAssignTo } from "@/lib/permissions";

// GET /api/teams/:id/tasks – List tasks for a team
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

    if (!can(access.role, "task.view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: { teamId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Get team tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team tasks" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/tasks – Create a new task for a team (any member allowed)
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

    if (!can(access.role, "task.create")) {
      return NextResponse.json(
        { error: "Forbidden: Only team members can create tasks in this team" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    if (status !== undefined && typeof status === "string" && status.trim()) {
      const normalized = status.toUpperCase();
      if (!["TODO", "IN_PROGRESS", "DONE"].includes(normalized)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    if (priority !== undefined && typeof priority === "string" && priority.trim()) {
      const normalized = priority.toUpperCase();
      if (!["LOW", "MEDIUM", "HIGH"].includes(normalized)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
    }

    // If assigneeId is provided, verify assignee is a member of this team.
    // MEMBER can only assign the task to themselves (OWNER/ADMIN to anyone).
    if (assigneeId) {
      const isValidAssignee =
        access.team.ownerId === assigneeId ||
        access.team.members.some((m) => m.userId === assigneeId);

      if (!isValidAssignee) {
        return NextResponse.json(
          { error: "Assignee must be a member of the team" },
          { status: 400 }
        );
      }

      if (!canAssignTo(access.role, assigneeId, authUser.id)) {
        return NextResponse.json(
          { error: "Forbidden: Members can only assign tasks to themselves" },
          { status: 403 }
        );
      }
    }

    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status:
          typeof status === "string" && status.trim()
            ? status.toUpperCase()
            : "TODO",
        priority:
          typeof priority === "string" && priority.trim()
            ? priority.toUpperCase()
            : "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        teamId,
        creatorId: authUser.id,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Create team task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
