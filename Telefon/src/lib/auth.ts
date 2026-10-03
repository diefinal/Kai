import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { APP_CONFIG } from "./constants";
import { AuthUserPayload } from "@/types";

const secretKey = new TextEncoder().encode(APP_CONFIG.jwtSecret);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: AuthUserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<AuthUserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthUserPayload;
  } catch {
    return null;
  }
}
