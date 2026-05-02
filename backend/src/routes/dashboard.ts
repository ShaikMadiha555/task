import { TaskStatus } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

dashboardRouter.get("/", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    select: { projectId: true },
  });

  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return res.json({
      summary: {
        totalTasks: 0,
        byStatus: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
        overdueCount: 0,
        dueSoonCount: 0,
      },
      overdueTasks: [],
      recentTasks: [],
    });
  }

  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdueWhere = {
    projectId: { in: projectIds },
    dueDate: { lt: now },
    status: { not: TaskStatus.DONE },
  } as const;

  const [totalTasks, byStatus, overdueCount, overdueTasks, dueSoonCount, recentTasks] = await Promise.all([
    prisma.task.count({ where: { projectId: { in: projectIds } } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    }),
    prisma.task.count({ where: overdueWhere }),
    prisma.task.findMany({
      where: overdueWhere,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: now, lte: inSevenDays },
        status: { not: TaskStatus.DONE },
      },
    }),
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
  ]);

  const statusMap: Record<TaskStatus, number> = {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.DONE]: 0,
  };
  for (const row of byStatus) {
    statusMap[row.status] = row._count.id;
  }

  return res.json({
    summary: {
      totalTasks,
      byStatus: statusMap,
        overdueCount,
      dueSoonCount,
    },
    overdueTasks: overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      project: t.project,
      assignee: t.assignee,
    })),
    recentTasks: recentTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      updatedAt: t.updatedAt,
      project: t.project,
      assignee: t.assignee,
    })),
  });
});
