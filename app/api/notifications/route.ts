import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/notifications – Latest notifications for the logged-in user,
// newest first, plus the unread count for the bell badge.
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
    const limit = Number.isNaN(limitParam)
      ? 20
      : Math.min(Math.max(limitParam, 1), 50);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: authUser.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: authUser.id, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
