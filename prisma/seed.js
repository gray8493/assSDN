const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Two verified test accounts in the SAME team for grading/demos:
//   test@example.com      – OWNER of the demo team
//   member@example.com    – MEMBER of the demo team
// Password for both: Password123!
// Custom-JWT auth has no email verification step, so both log in directly.
const OWNER_EMAIL = "test@example.com";
const MEMBER_EMAIL = "member@example.com";
const PASSWORD = "Password123!";

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { password: hashedPassword },
    create: {
      name: "Test Grader",
      email: OWNER_EMAIL,
      password: hashedPassword,
    },
  });
  console.log("Seeded test user (owner):", owner.email);

  const member = await prisma.user.upsert({
    where: { email: MEMBER_EMAIL },
    update: { password: hashedPassword },
    create: {
      name: "Demo Member",
      email: MEMBER_EMAIL,
      password: hashedPassword,
    },
  });
  console.log("Seeded test user (member):", member.email);

  const existingTeam = await prisma.team.findFirst({
    where: { OR: [{ ownerId: owner.id }, { members: { some: { userId: owner.id } } }] },
    include: { members: true },
  });

  if (!existingTeam) {
    const team = await prisma.team.create({
      data: {
        name: "Alpha Engineering Squad",
        description:
          "Core product engineering team managing sprint deliverables and infrastructure.",
        ownerId: owner.id,
        members: {
          create: [
            { userId: owner.id, role: "OWNER" },
            { userId: member.id, role: "MEMBER" },
          ],
        },
      },
      include: { members: true },
    });

    console.log("Created test team:", team.name);

    await prisma.task.createMany({
      data: [
        {
          title: "Implement Next.js Route Handlers",
          description:
            "Build robust REST endpoints for teams and tasks with authentication.",
          status: "DONE",
          priority: "HIGH",
          teamId: team.id,
          creatorId: owner.id,
          assigneeId: owner.id,
        },
        {
          title: "Design Kanban Board UI",
          description:
            "Develop responsive column task management view with quick status toggles.",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          teamId: team.id,
          creatorId: owner.id,
          assigneeId: owner.id,
        },
        {
          title: "Deploy to Vercel & Supabase",
          description:
            "Configure environment variables and verify production database connection.",
          status: "TODO",
          priority: "HIGH",
          teamId: team.id,
          creatorId: owner.id,
          assigneeId: member.id,
        },
      ],
    });

    console.log("Created 3 initial tasks for team:", team.name);
  } else {
    console.log("Test team already exists:", existingTeam.name);

    const teamId = existingTeam.id;
    const hasMembership = existingTeam.members.some((m) => m.userId === member.id);
    if (!hasMembership) {
      await prisma.teamMember.create({
        data: { teamId, userId: member.id, role: "MEMBER" },
      });
      console.log("Added member account to existing team as MEMBER");
    } else {
      console.log("Member account is already in the team");
    }
  }
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
