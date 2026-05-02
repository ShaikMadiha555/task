import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { authMiddleware, type AuthedRequest } from "../middleware/auth.js";
import { loginSchema, parseBody, registerSchema } from "../validation/schemas.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = parseBody(registerSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const token = signToken({ sub: user.id, email: user.email });
  return res.status(201).json({ user, token });
});

authRouter.post("/login", async (req, res) => {
  const parsed = parseBody(loginSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken({ sub: user.id, email: user.email });
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    token,
  });
});

authRouter.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});
