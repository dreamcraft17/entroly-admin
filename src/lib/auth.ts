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

async function getPublicKey() {
  const rawKey = process.env.JWT_PUBLIC_KEY;
  if (!rawKey) throw new Error("JWT_PUBLIC_KEY not configured");
  const pem = rawKey.replace(/\\n/g, "\n");
  return importSPKI(pem, "RS256");
}

export async function verifyAdminToken(
  req: NextRequest
): Promise<AdminUser | null> {
  const token =
    req.cookies.get("admin_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) return null;

  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["RS256"],
    });

    if (
      !payload.sub ||
      !payload.email ||
      !payload.adminRole
    ) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email as string,
      name: (payload.name as string) ?? null,
      adminRole: payload.adminRole as AdminRole,
    };
  } catch {
    return null;
  }
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
