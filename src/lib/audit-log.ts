import { prisma } from "@/lib/prisma";
import { AdminRole } from "@prisma/client";

interface WriteAuditLogParams {
  operatorId: string;
  operatorRole: AdminRole | string;
  actionType: string;
  entityType: string;
  entityId: string;
  beforeValue?: object | null;
  afterValue?: object | null;
  ipAddress?: string;
}

export async function writeAuditLog(params: WriteAuditLogParams) {
  await prisma.adminAuditLog.create({
    data: {
      operatorId: params.operatorId,
      operatorRole: params.operatorRole,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeValue: params.beforeValue ?? undefined,
      afterValue: params.afterValue ?? undefined,
      ipAddress: params.ipAddress,
    },
  });
}
