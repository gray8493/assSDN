const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "test@example.com";
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword },
    create: {
      name: "Test Grader",
      email,
      password: hashedPassword,
    },
  });

  console.log("Seeded test user:", user.email, "(ID:", user.id, ")");

  const existingTeam = await prisma.team.findFirst({
    where: { ownerId: user.id },
  });

  if (!existingTeam) {
    const team = await prisma.team.create({
      data: {
        name: "Alpha Engineering Squad",
        description:
          "Core product engineering team managing sprint deliverables and infrastructure.",
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
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
          creatorId: user.id,
          assigneeId: user.id,
        },
        {
          title: "Design Kanban Board UI",
          description:
            "Develop responsive column task management view with quick status toggles.",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          teamId: team.id,
          creatorId: user.id,
          assigneeId: user.id,
        },
        {
          title: "Deploy to Vercel & Supabase",
          description:
            "Configure environment variables and verify production database connection.",
          status: "TODO",
          priority: "HIGH",
          teamId: team.id,
          creatorId: user.id,
          assigneeId: user.id,
        },
      ],
    });

    console.log("Created 3 initial tasks for team:", team.name);
  } else {
    console.log("Test team already exists:", existingTeam.name);
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
