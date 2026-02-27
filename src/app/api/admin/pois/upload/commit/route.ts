import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const PoiRowSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["ACC", "TTD", "FNB"]),
  market: z.enum(["IDN", "US", "SGP"]),
  address: z.string().optional(),
  city: z.string().optional(),
});

const CommitBodySchema = z.object({
  idempotencyKey: z.string().min(1),
  added: z.array(PoiRowSchema),
  updated: z.array(PoiRowSchema),
  deactivatedExternalIds: z.array(z.string()),
});

// POST /api/admin/pois/upload/commit — apply dry-run after approval
export async function POST(req: NextRequest) {
  const user = await verifyAdminToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(user.adminRole, "OPERATOR"))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const parsed = CommitBodySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

  const { idempotencyKey, added, updated, deactivatedExternalIds } = parsed.data;

  // Idempotency check — if this key was already committed, return early
  const alreadyDone = await prisma.adminAuditLog.findFirst({
    where: { actionType: "POI_BULK_COMMIT", entityId: idempotencyKey },
  });
  if (alreadyDone) return NextResponse.json({ ok: true, skipped: true, reason: "Already committed" });

  await prisma.$transaction(async (tx) => {
    // Insert new POIs
    for (const row of added) {
      await tx.poi.create({
        data: {
          externalId: row.externalId,
          name: row.name,
          type: row.type,
          market: row.market,
          address: row.address,
          city: row.city,
          isActive: true,
        },
      });
    }

    // Update changed POIs
    for (const row of updated) {
      await tx.poi.updateMany({
        where: { externalId: row.externalId },
        data: {
          name: row.name,
          type: row.type,
          market: row.market,
          address: row.address ?? null,
          city: row.city ?? null,
          isActive: true,
        },
      });
    }

    // Deactivate removed POIs
    if (deactivatedExternalIds.length > 0) {
      await tx.poi.updateMany({
        where: { externalId: { in: deactivatedExternalIds } },
        data: { isActive: false },
      });
    }
  });

  await writeAuditLog({
    operatorId: user.id,
    operatorRole: user.adminRole,
    actionType: "POI_BULK_COMMIT",
    entityType: "Poi",
    entityId: idempotencyKey,
    afterValue: {
      added: added.length,
      updated: updated.length,
      deactivated: deactivatedExternalIds.length,
    },
  });

  return NextResponse.json({
    ok: true,
    added: added.length,
    updated: updated.length,
    deactivated: deactivatedExternalIds.length,
  });
}
