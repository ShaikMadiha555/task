import { ProjectRole } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";
import { routeParam } from "../lib/routeParams.js";
import { parseBody, updateTaskSchema } from "../validation/schemas.js";

export const tasksRouter = Router();
tasksRouter.use(authMiddleware);

async function assertAssigneeInProject(projectId: string, assigneeId: string | null | undefined) {
  if (assigneeId == null) return;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  if (!m) throw new Error("ASSIGNEE_NOT_MEMBER");
}

tasksRouter.get("/:taskId", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const taskId = routeParam(req.params, "taskId");
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: true,
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!task) return res.status(404).json({ error: "Task not found" });

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: task.projectId, userId: req.user.id } },
  });
  if (!member) return res.status(403).json({ error: "Forbidden" });

  return res.json({ task });
});

tasksRouter.patch("/:taskId", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = parseBody(updateTaskSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const taskId = routeParam(req.params, "taskId");
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!existing) return res.status(404).json({ error: "Task not found" });

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: existing.projectId, userId: req.user.id } },
  });
  if (!member) return res.status(403).json({ error: "Forbidden" });

  const isAdmin = member.role === ProjectRole.ADMIN;
  const isCreator = existing.createdById === req.user.id;
  const isAssignee = existing.assigneeId === req.user.id;

  if (!isAdmin && !isCreator && !isAssignee) {
    return res.status(403).json({ error: "Only admins, the creator, or assignee can update this task" });
  }

  if (!isAdmin && (parsed.data.title !== undefined || parsed.data.description !== undefined)) {
    return res.status(403).json({ error: "Only project admins can change title or description" });
  }

  try {
    if (parsed.data.assigneeId !== undefined) {
      await assertAssigneeInProject(existing.projectId, parsed.data.assigneeId);
    }
  } catch (e) {
    if ((e as Error).message === "ASSIGNEE_NOT_MEMBER") {
      return res.status(400).json({ error: "Assignee must be a project member" });
    }
    throw e;
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.dueDate !== undefined) data.dueDate = parsed.data.dueDate;
  if (parsed.data.assigneeId !== undefined) data.assigneeId = parsed.data.assigneeId;

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return res.json({ task });
});

tasksRouter.delete("/:taskId", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const taskId = routeParam(req.params, "taskId");
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: existing.projectId, userId: req.user.id } },
  });
  if (!member) return res.status(403).json({ error: "Forbidden" });

  const isAdmin = member.role === ProjectRole.ADMIN;
  const isCreator = existing.createdById === req.user.id;
  if (!isAdmin && !isCreator) {
    return res.status(403).json({ error: "Only admins or the task creator can delete this task" });
  }

  await prisma.task.delete({ where: { id: taskId } });
  return res.status(204).send();
});
