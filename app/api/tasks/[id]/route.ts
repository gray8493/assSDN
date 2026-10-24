import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { loadTeamAccess } from "@/lib/teamAccess";
import {
  canAssignTo,
  canDeleteTask,
  canModifyTask,
  type Role,
} from "@/lib/permissions";
import { broadcastEvent, TEAM_CHANNEL, EVENTS } from "@/lib/realtime";
import { notifyTaskAssigned } from "@/lib/notifications";

const taskInclude = {
  assignee: {
    select: { id: true, name: true, email: true },
  },
  creator: {
    select: { id: true, name: true, email: true },
  },
} as const;

// PUT /api/tasks/[id] – Update a task
// - Team task: OWNER/ADMIN can update any task; MEMBER only their own
//   (created by them or assigned to them). MEMBER can only assign to self.
// - Personal task (no team): only the creator or the assignee may update.
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
            members: { select: { id: true, userId: true, role: true } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let teamRole: Role | null = null;
    if (existingTask.teamId) {
      const access = await loadTeamAccess(authUser.id, existingTask.teamId);
      if (!access.ok) {
        return NextResponse.json(
          {
            error:
              access.status === 404
                ? "Team not found"
                : "Forbidden: You are not a member of this task's team",
          },
          { status: access.status }
        );
      }
      teamRole = access.role;
    }

    if (!canModifyTask(teamRole, existingTask, authUser.id)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Members can only update tasks they created or are assigned to",
        },
        { status: 403 }
      );
    }

    // Assignee rules: must belong to the task's team (if any);
    // MEMBER can only assign the task to themselves.
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "") {
      if (existingTask.team) {
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

      if (!canAssignTo(teamRole, assigneeId, authUser.id)) {
        return NextResponse.json(
          { error: "Forbidden: Members can only assign tasks to themselves" },
          { status: 403 }
        );
      }
    }

    if (title !== undefined && (!title || typeof title !== "string" || !title.trim())) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
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

    const previousAssigneeId = existingTask.assigneeId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && {
          description: description ? description.trim() : null,
        }),
        ...(status !== undefined && {
          status: typeof status === "string" ? status.toUpperCase() : status,
        }),
        ...(priority !== undefined && {
          priority: typeof priority === "string" ? priority.toUpperCase() : priority,
        }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(assigneeId !== undefined && {
          assigneeId: assigneeId || null,
        }),
      },
      include: taskInclude,
    });

    if (existingTask.teamId) {
      broadcastEvent(
        TEAM_CHANNEL(existingTask.teamId),
        EVENTS.TASK_UPDATED,
        updatedTask
      ).catch(() => undefined);
    }

    // Notify when the task got a (new) assignee, not for self-assignment
    if (updatedTask.assigneeId && updatedTask.assigneeId !== previousAssigneeId) {
      await notifyTaskAssigned({
        assigneeId: updatedTask.assigneeId,
        actorId: authUser.id,
        actorName: authUser.name,
        taskTitle: updatedTask.title,
        teamId: updatedTask.teamId,
      });
    }

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
// - Team task: OWNER/ADMIN can delete any task; MEMBER only their own
// - Personal task: only creator/assignee
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
        team: {
          include: {
            members: { select: { id: true, userId: true, role: true } },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let teamRole: Role | null = null;
    if (existingTask.teamId) {
      const access = await loadTeamAccess(authUser.id, existingTask.teamId);
      if (!access.ok) {
        return NextResponse.json(
          {
            error:
              access.status === 404
                ? "Team not found"
                : "Forbidden: You are not a member of this task's team",
          },
          { status: access.status }
        );
      }
      teamRole = access.role;
    }

    if (!canDeleteTask(teamRole, existingTask, authUser.id)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Members can only delete tasks they created or are assigned to",
        },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    if (existingTask.teamId) {
      broadcastEvent(
        TEAM_CHANNEL(existingTask.teamId),
        EVENTS.TASK_DELETED,
        { id: existingTask.id, teamId: existingTask.teamId }
      ).catch(() => undefined);
    }

    return NextResponse.json({ message: "Task deleted successfully", id });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
