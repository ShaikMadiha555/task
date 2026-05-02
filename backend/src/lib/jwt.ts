import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}

const secret = (): Secret => JWT_SECRET ?? "dev-only-change-in-production";

export type JwtPayload = { sub: string; email: string };

export function signToken(payload: JwtPayload, expiresIn: SignOptions["expiresIn"] = "7d"): string {
  return jwt.sign(payload, secret(), { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret()) as JwtPayload;
}
