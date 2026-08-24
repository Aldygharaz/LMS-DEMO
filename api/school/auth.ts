import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import * as cookie from "cookie";
import * as jose from "jose";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { SchoolRole, SchoolUser } from "@db/schema";
import { schoolUsers } from "@db/schema";
import type { TrpcContext } from "../context";
import { getSessionCookieOptions } from "../lib/cookies";
import { env } from "../lib/env";
import { getDb } from "../queries/connection";

export const SCHOOL_COOKIE = "lms_sid";
const JWT_ALG = "HS256";
const scryptAsync = promisify(scrypt);

// ---------------------------------------------------------------------------
// Password hashing (scrypt + salt, format: salt:hash hex)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

// ---------------------------------------------------------------------------
// JWT session
// ---------------------------------------------------------------------------

async function signSchoolToken(schoolUserId: number): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT({ sid: schoolUserId })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

async function verifySchoolToken(token: string): Promise<number | null> {
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });
    return typeof payload.sid === "number" ? payload.sid : null;
  } catch {
    return null;
  }
}

export async function getSessionSchoolUser(
  headers: Headers,
): Promise<SchoolUser | null> {
  const raw = headers.get("cookie");
  if (!raw) return null;
  const parsed = cookie.parse(raw);
  const token = parsed[SCHOOL_COOKIE];
  if (!token) return null;
  const userId = await verifySchoolToken(token);
  if (!userId) return null;
  const rows = await getDb()
    .select()
    .from(schoolUsers)
    .where(eq(schoolUsers.id, userId))
    .limit(1);
  return rows.at(0) ?? null;
}

// ---------------------------------------------------------------------------
// Cookie helpers (via tRPC resHeaders)
// ---------------------------------------------------------------------------

export async function setSchoolSessionCookie(
  ctx: TrpcContext,
  schoolUserId: number,
): Promise<void> {
  const token = await signSchoolToken(schoolUserId);
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(SCHOOL_COOKIE, token, {
      httpOnly: true,
      path: "/",
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: 30 * 24 * 60 * 60,
    }),
  );
}

export function clearSchoolSessionCookie(ctx: TrpcContext): void {
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(SCHOOL_COOKIE, "", {
      httpOnly: true,
      path: "/",
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: 0,
    }),
  );
}

// ---------------------------------------------------------------------------
// Role guard — dipakai di awal setiap procedure LMS
// ---------------------------------------------------------------------------

export async function requireSchoolUser(
  ctx: TrpcContext,
  roles?: SchoolRole[],
): Promise<SchoolUser> {
  const user = await getSessionSchoolUser(ctx.req.headers);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Silakan login terlebih dahulu.",
    });
  }
  if (roles && !roles.includes(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda tidak memiliki akses ke fitur ini.",
    });
  }
  return user;
}
