import { ProjectRole, TaskStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";

async function main() {
  const passwordHash = await hashPassword("Demo1234!");

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Admin",
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Member",
      passwordHash,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-demo-project" },
    update: {},
    create: {
      id: "seed-demo-project",
      name: "Demo project",
      description: "Seeded for quick testing",
      ownerId: alice.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: alice.id },
    },
    update: { role: ProjectRole.ADMIN },
    create: {
      projectId: project.id,
      userId: alice.id,
      role: ProjectRole.ADMIN,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: bob.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: bob.id,
      role: ProjectRole.MEMBER,
    },
  });

  const existingTasks = await prisma.task.count({ where: { projectId: project.id } });
  if (existingTasks === 0) {
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const past = new Date();
    past.setDate(past.getDate() - 3);

    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          title: "Welcome task",
          description: "Mark this complete",
          status: TaskStatus.TODO,
          dueDate: soon,
          assigneeId: bob.id,
          createdById: alice.id,
        },
        {
          projectId: project.id,
          title: "Overdue example",
          status: TaskStatus.IN_PROGRESS,
          dueDate: past,
          assigneeId: alice.id,
          createdById: alice.id,
        },
      ],
    });
  }

  console.log("Seed OK — demo logins: alice@example.com / Demo1234!  |  bob@example.com / Demo1234!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
