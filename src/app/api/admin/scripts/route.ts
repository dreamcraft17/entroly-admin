import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole, getClientIp } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createScriptSchema } from "@/lib/validations/script";
import { AdminRole } from "@prisma/client";

// GET /api/admin/scripts
export async function GET(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const poiType = searchParams.get("poiType");
  const language = searchParams.get("language");
  const market = searchParams.get("market");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

  const where = {
    ...(poiType ? { poiType } : {}),
    ...(language ? { language } : {}),
    ...(market ? { market } : {}),
  };

  const [scripts, total] = await Promise.all([
    prisma.scriptLibrary.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scriptLibrary.count({ where }),
  ]);

  return NextResponse.json({ data: scripts, total, page, limit });
}

// POST /api/admin/scripts
export async function POST(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, AdminRole.OPERATOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createScriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const script = await prisma.scriptLibrary.create({ data: parsed.data });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "CREATE",
    entityType: "SCRIPT",
    entityId: script.id,
    afterValue: script,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: script }, { status: 201 });
}
