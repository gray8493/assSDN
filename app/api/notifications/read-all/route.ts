import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/notifications/read-all – Mark all of the user's notifications read
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: { userId: authUser.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({
      message: "All notifications marked as read",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json(
      { error: "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
