import { TaskStatus } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
});

export const addMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(10000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const first = Object.entries(msg).flatMap(([k, v]) => (v?.length ? `${k}: ${v.join(", ")}` : []))[0];
    return { ok: false, error: first ?? "Validation failed" };
  }
  return { ok: true, data: r.data };
}
