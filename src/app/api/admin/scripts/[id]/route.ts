import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole, getClientIp } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { updateScriptSchema } from "@/lib/validations/script";
import { AdminRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/scripts/[id]
export async function GET(req: NextRequest, { params }: Params) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const script = await prisma.scriptLibrary.findUnique({ where: { id } });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: script });
}

// PUT /api/admin/scripts/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, AdminRole.OPERATOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.scriptLibrary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateScriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await prisma.scriptLibrary.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "UPDATE",
    entityType: "SCRIPT",
    entityId: id,
    beforeValue: existing,
    afterValue: updated,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/admin/scripts/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, AdminRole.OPERATOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.scriptLibrary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.scriptLibrary.delete({ where: { id } });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "DELETE",
    entityType: "SCRIPT",
    entityId: id,
    beforeValue: existing,
    ipAddress: getClientIp(req),
  });

  return new NextResponse(null, { status: 204 });
}
