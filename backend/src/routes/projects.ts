import { ProjectRole } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";
import {
  loadProjectMembership,
  requireProjectRole,
  type ProjectScope,
} from "../middleware/projectAccess.js";
import { routeParam } from "../lib/routeParams.js";
import {
  addMemberSchema,
  createProjectSchema,
  createTaskSchema,
  parseBody,
  updateMemberRoleSchema,
  updateProjectSchema,
} from "../validation/schemas.js";

export const projectsRouter = Router();
projectsRouter.use(authMiddleware);

projectsRouter.get("/", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const memberships = await prisma.projectMember.findMany({
    where: { userId: req.user.id },
    include: {
      project: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true, members: true } },
        },
      },
    },
    orderBy: { project: { createdAt: "desc" } },
  });

  const projects = memberships.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    description: m.project.description,
    role: m.role,
    createdAt: m.project.createdAt,
    owner: m.project.owner,
    taskCount: m.project._count.tasks,
    memberCount: m.project._count.members,
  }));

  return res.json({ projects });
});

projectsRouter.post("/", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = parseBody(createProjectSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
        ownerId: req.user!.id,
      },
    });
    await tx.projectMember.create({
      data: {
        projectId: p.id,
        userId: req.user!.id,
        role: ProjectRole.ADMIN,
      },
    });
    return p;
  });

  return res.status(201).json({ project });
});

async function getScope(req: AuthedRequest): Promise<ProjectScope | undefined> {
  return (req as AuthedRequest & { projectScope?: ProjectScope }).projectScope;
}

async function assertAssigneeInProject(projectId: string, assigneeId: string | null | undefined) {
  if (assigneeId == null) return;
  const m = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  if (!m) throw new Error("ASSIGNEE_NOT_MEMBER");
}

projectsRouter.get(
  "/:projectId/tasks",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const tasks = await prisma.task.findMany({
      where: { projectId: scope.projectId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return res.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        assignee: t.assignee,
        createdBy: t.createdBy,
      })),
    });
  }
);

projectsRouter.post(
  "/:projectId/tasks",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const parsed = parseBody(createTaskSchema, req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    try {
      await assertAssigneeInProject(scope.projectId, parsed.data.assigneeId ?? null);
    } catch (e) {
      if ((e as Error).message === "ASSIGNEE_NOT_MEMBER") {
        return res.status(400).json({ error: "Assignee must be a project member" });
      }
      throw e;
    }

    const task = await prisma.task.create({
      data: {
        projectId: scope.projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? undefined,
        status: parsed.data.status ?? undefined,
        dueDate: parsed.data.dueDate ?? undefined,
        assigneeId: parsed.data.assigneeId ?? undefined,
        createdById: req.user!.id,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({ task });
  }
);

projectsRouter.get(
  "/:projectId",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const project = await prisma.project.findUnique({
      where: { id: scope.projectId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) return res.status(404).json({ error: "Project not found" });

    return res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        owner: project.owner,
        yourRole: scope.role,
        members: project.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        })),
        taskCount: project._count.tasks,
      },
    });
  }
);

projectsRouter.patch(
  "/:projectId",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  requireProjectRole(ProjectRole.ADMIN),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const parsed = parseBody(updateProjectSchema, req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const data: { name?: string; description?: string | null } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description ?? null;

    const project = await prisma.project.update({
      where: { id: scope.projectId },
      data,
    });

    return res.json({ project });
  }
);

projectsRouter.delete(
  "/:projectId",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  requireProjectRole(ProjectRole.ADMIN),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    await prisma.project.delete({ where: { id: scope.projectId } });
    return res.status(204).send();
  }
);

projectsRouter.post(
  "/:projectId/members",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  requireProjectRole(ProjectRole.ADMIN),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const parsed = parseBody(addMemberSchema, req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return res.status(404).json({ error: "No user with that email" });

    try {
      const member = await prisma.projectMember.create({
        data: {
          projectId: scope.projectId,
          userId: user.id,
          role: parsed.data.role as ProjectRole,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      return res.status(201).json({
        member: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
        },
      });
    } catch {
      return res.status(409).json({ error: "User is already a member" });
    }
  }
);

projectsRouter.patch(
  "/:projectId/members/:userId",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  requireProjectRole(ProjectRole.ADMIN),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const userId = routeParam(req.params, "userId");
    const parsed = parseBody(updateMemberRoleSchema, req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    if (userId === req.user!.id) {
      return res.status(400).json({ error: "You cannot change your own role here" });
    }

    const project = await prisma.project.findUnique({ where: { id: scope.projectId } });
    if (project?.ownerId === userId && parsed.data.role !== ProjectRole.ADMIN) {
      return res.status(400).json({ error: "Project owner must remain an admin" });
    }

    const updated = await prisma.projectMember.updateMany({
      where: { projectId: scope.projectId, userId },
      data: { role: parsed.data.role as ProjectRole },
    });

    if (updated.count === 0) return res.status(404).json({ error: "Member not found" });
    return res.json({ ok: true });
  }
);

projectsRouter.delete(
  "/:projectId/members/:userId",
  (req, res, next) => loadProjectMembership(req as AuthedRequest, res, next, "projectId"),
  requireProjectRole(ProjectRole.ADMIN),
  async (req: AuthedRequest, res) => {
    const scope = await getScope(req);
    if (!scope) return;

    const userId = routeParam(req.params, "userId");
    const project = await prisma.project.findUnique({ where: { id: scope.projectId } });
    if (project?.ownerId === userId) {
      return res.status(400).json({ error: "Cannot remove the project owner" });
    }

    const deleted = await prisma.projectMember.deleteMany({
      where: { projectId: scope.projectId, userId },
    });

    if (deleted.count === 0) return res.status(404).json({ error: "Member not found" });
    return res.status(204).send();
  }
);
