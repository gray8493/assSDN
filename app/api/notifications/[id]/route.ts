import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// PATCH /api/notifications/:id – Mark one of *your* notifications as read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== authUser.id) {
      // IDOR guard: notifications belong to their user only
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
