import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// PUT /api/tasks/[id] – Update a task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Permission check for updating:
    // If task belongs to a team, user must be a member or owner of the team
    if (existingTask.team) {
      const isMember =
        existingTask.team.ownerId === authUser.id ||
        existingTask.team.members.some((m) => m.userId === authUser.id);

      if (!isMember) {
        return NextResponse.json(
          { error: "Forbidden: You are not a member of this task's team" },
          { status: 403 }
        );
      }

      // If updating assigneeId, verify new assignee belongs to the team
      if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "") {
        const isValidAssignee =
          existingTask.team.ownerId === assigneeId ||
          existingTask.team.members.some((m) => m.userId === assigneeId);

        if (!isValidAssignee) {
          return NextResponse.json(
            { error: "Assignee must be a member of the team" },
            { status: 400 }
          );
        }
      }
    }

    if (title !== undefined && (!title || typeof title !== "string" || !title.trim())) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && {
          description: description ? description.trim() : null,
        }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(assigneeId !== undefined && {
          assigneeId: assigneeId || null,
        }),
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

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] – Delete a task
// "Only the task creator, the assignee, or the team Owner can delete a task."
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isCreator = existingTask.creatorId === authUser.id;
    const isAssignee = existingTask.assigneeId === authUser.id;
    const isTeamOwner = existingTask.team?.ownerId === authUser.id;

    // If task has neither creator nor assignee nor team owner set (e.g. unassigned task), allow authenticated delete
    const hasAnyOwner = existingTask.creatorId || existingTask.assigneeId || existingTask.team?.ownerId;
    if (hasAnyOwner && !isCreator && !isAssignee && !isTeamOwner) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only the task creator, assignee, or team owner can delete this task",
        },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Task deleted successfully", id });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
