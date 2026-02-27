import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole, getClientIp } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { AdminRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/templates/[id]/archive — soft archive
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, AdminRole.OPERATOR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!existing.isActive) {
    return NextResponse.json({ error: "Template already archived" }, { status: 409 });
  }

  const archived = await prisma.template.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
  });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "ARCHIVE",
    entityType: "TEMPLATE",
    entityId: id,
    beforeValue: existing,
    afterValue: archived,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: archived });
}
