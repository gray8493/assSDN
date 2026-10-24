import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { loadTeamAccess } from "@/lib/teamAccess";
import { can } from "@/lib/permissions";
import { broadcastEvent, TEAM_CHANNEL } from "@/lib/realtime";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 2000;

// GET /api/teams/:id/messages?limit=50&before=<ISO-createdAt>
// Default: latest 50 messages, returned in chronological order (oldest→newest).
// Cursor pagination: pass `before` = createdAt ISO of the oldest loaded message.
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

    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
    const limit = Number.isNaN(limitParam)
      ? DEFAULT_LIMIT
      : Math.min(Math.max(limitParam, 1), MAX_LIMIT);
    const before = url.searchParams.get("before");
    const beforeDate =
      before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;

    const messages = await prisma.message.findMany({
      where: {
        teamId,
        ...(beforeDate && { createdAt: { lt: beforeDate } }),
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const page = (hasMore ? messages.slice(0, limit) : messages).reverse();
    const nextCursor = hasMore ? (page[0]?.createdAt ?? null) : null;

    return NextResponse.json({
      messages: page,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/messages – Send a chat message (team members only).
// Saved with Prisma first, then broadcast to `team:{teamId}` so other
// members' clients render it instantly.
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

    if (!can(access.role, "team.view")) {
      return NextResponse.json(
        { error: "Forbidden: Only team members can send messages" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        teamId,
        senderId: authUser.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Broadcast (fire and forget – DB save already succeeded)
    broadcastEvent(TEAM_CHANNEL(teamId), "message.new", message).catch(
      () => undefined
    );

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Create message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
