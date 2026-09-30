import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/tasks – List tasks for current user
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return tasks that:
    // 1. Belong to a team the user is part of (as owner or member)
    // 2. Or where the user is assignee or creator
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { creatorId: authUser.id },
          { assigneeId: authUser.id },
          {
            team: {
              OR: [
                { ownerId: authUser.id },
                { members: { some: { userId: authUser.id } } },
              ],
            },
          },
        ],
      },
      include: {
        team: {
          select: { id: true, name: true, ownerId: true },
        },
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
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks from database" },
      { status: 500 }
    );
  }
}

// POST /api/tasks – Create a new task
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, teamId, assigneeId } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // If teamId is specified, check if user is a member of that team
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true },
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

      if (assigneeId) {
        const isValidAssignee =
          team.ownerId === assigneeId ||
          team.members.some((m) => m.userId === assigneeId);

        if (!isValidAssignee) {
          return NextResponse.json(
            { error: "Assignee must be a member of the team" },
            { status: 400 }
          );
        }
      }
    }

    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        teamId: teamId || null,
        creatorId: authUser.id,
        assigneeId: assigneeId || null,
      },
      include: {
        team: {
          select: { id: true, name: true, ownerId: true },
        },
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
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
