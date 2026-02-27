import { jwtVerify, importSPKI } from "jose";
import { NextRequest } from "next/server";
import { AdminRole } from "@prisma/client";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  adminRole: AdminRole;
}

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function hasMinRole(userRole: AdminRole, minRole: AdminRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

function extractToken(req: NextRequest): string | null {
  return (
    req.cookies.get("admin_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    null
  );
}

function parsePayload(payload: Record<string, unknown>): AdminUser | null {
  if (!payload.sub || !payload.email || !payload.adminRole) return null;
  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: (payload.name as string) ?? null,
    adminRole: payload.adminRole as AdminRole,
  };
}

// Verify HS256 token (issued by admin login)
async function verifyHS256(token: string): Promise<AdminUser | null> {
  try {
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return parsePayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}

// Verify RS256 token (issued by SSO)
async function verifyRS256(token: string): Promise<AdminUser | null> {
  try {
    const rawKey = process.env.JWT_PUBLIC_KEY;
    if (!rawKey) return null;
    const pem = rawKey.replace(/\\n/g, "\n");
    const publicKey = await importSPKI(pem, "RS256");
    const { payload } = await jwtVerify(token, publicKey, { algorithms: ["RS256"] });
    return parsePayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function verifyAdminToken(req: NextRequest): Promise<AdminUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  // Try HS256 first (admin login), then RS256 (SSO)
  return (await verifyHS256(token)) ?? (await verifyRS256(token));
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
