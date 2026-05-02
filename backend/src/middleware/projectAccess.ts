import type { ProjectRole } from "@prisma/client";
import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { routeParam } from "../lib/routeParams.js";
import type { AuthedRequest } from "./auth.js";

export type ProjectScope = {
  projectId: string;
  userId: string;
  role: ProjectRole;
};

export async function loadProjectMembership(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
  projectIdParam = "projectId"
) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = routeParam(req.params, projectIdParam);
  if (!projectId) return res.status(400).json({ error: "Missing project id" });

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: req.user.id },
    },
  });

  if (!member) {
    return res.status(403).json({ error: "You are not a member of this project" });
  }

  (req as AuthedRequest & { projectScope: ProjectScope }).projectScope = {
    projectId,
    userId: req.user.id,
    role: member.role,
  };
  next();
}

export function requireProjectRole(...allowed: ProjectRole[]) {
  return (req: AuthedRequest & { projectScope?: ProjectScope }, res: Response, next: NextFunction) => {
    const scope = req.projectScope;
    if (!scope) return res.status(500).json({ error: "Project scope not loaded" });
    if (!allowed.includes(scope.role)) {
      return res.status(403).json({ error: "Insufficient permissions for this project" });
    }
    next();
  };
}
