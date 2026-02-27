import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { Prisma } from "@prisma/client";

// POST /api/admin/campaigns/cron
// Called by external scheduler (cron job / GitHub Actions / systemd timer).
// Protected by CRON_SECRET env var.
//
// Two jobs in one:
//   1. Auto-publish: DRAFT campaigns with autoPublish=true whose startDate has arrived
//   2. Budget cap close: ACTIVE campaigns where totalCredited >= maxTotalCredits
//   3. Recurring: CLOSED WEEKLY/MONTHLY campaigns past endDate — create next cycle
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const published: string[] = [];
  const closed: string[] = [];
  const spawned: string[] = [];

  // 1. Auto-publish DRAFT campaigns whose startDate has arrived
  const toPublish = await prisma.campaign.findMany({
    where: { status: "DRAFT", autoPublish: true, startDate: { lte: now } },
  });

  for (const c of toPublish) {
    await prisma.campaign.update({ where: { id: c.id }, data: { status: "ACTIVE" } });
    await writeAuditLog({
      operatorId: "cron",
      operatorRole: "SUPER_ADMIN",
      actionType: "CAMPAIGN_AUTO_PUBLISH",
      entityType: "Campaign",
      entityId: c.id,
      beforeValue: { status: "DRAFT" },
      afterValue: { status: "ACTIVE" },
    });
    published.push(c.id);
  }

  // 2. Budget cap close: ACTIVE campaigns where totalCredited >= maxTotalCredits
  const toClose = await prisma.campaign.findMany({
    where: {
      status: "ACTIVE",
      maxTotalCredits: { not: null },
    },
  });

  for (const c of toClose) {
    if (c.maxTotalCredits && c.totalCredited.gte(c.maxTotalCredits)) {
      await prisma.campaign.update({ where: { id: c.id }, data: { status: "CLOSED" } });
      await writeAuditLog({
        operatorId: "cron",
        operatorRole: "SUPER_ADMIN",
        actionType: "CAMPAIGN_BUDGET_CAP_CLOSE",
        entityType: "Campaign",
        entityId: c.id,
        beforeValue: { status: "ACTIVE", totalCredited: c.totalCredited.toString() },
        afterValue: { status: "CLOSED", reason: "budget_cap_reached" },
      });
      closed.push(c.id);
    }
  }

  // 3. Spawn next cycle for WEEKLY/MONTHLY recurring campaigns that just closed
  const recurringClosed = await prisma.campaign.findMany({
    where: {
      status: "CLOSED",
      frequency: { in: ["WEEKLY", "MONTHLY"] },
      autoPublish: true,
      endDate: { lte: now },
    },
  });

  for (const c of recurringClosed) {
    // Only spawn if no future cycle exists
    const nextExists = await prisma.campaign.findFirst({
      where: { name: c.name, startDate: { gt: c.endDate } },
    });
    if (nextExists) continue;

    const duration = c.endDate.getTime() - c.startDate.getTime();
    const nextStart = new Date(c.endDate.getTime() + 1);
    const nextEnd = new Date(nextStart.getTime() + duration);

    const nextCampaign = await prisma.campaign.create({
      data: {
        name: c.name,
        description: c.description,
        targetPoiTypes: c.targetPoiTypes,
        requiredPosts: c.requiredPosts,
        creditReward: c.creditReward,
        currency: c.currency,
        startDate: nextStart,
        endDate: nextEnd,
        maxParticipants: c.maxParticipants,
        maxTotalCredits: c.maxTotalCredits,
        frequency: c.frequency,
        autoPublish: true,
        status: "DRAFT",
        createdBy: c.createdBy,
      },
    });

    await writeAuditLog({
      operatorId: "cron",
      operatorRole: "SUPER_ADMIN",
      actionType: "CAMPAIGN_SPAWN_NEXT_CYCLE",
      entityType: "Campaign",
      entityId: nextCampaign.id,
      afterValue: { parentId: c.id, nextStart: nextStart.toISOString() },
    });

    spawned.push(nextCampaign.id);
  }

  return NextResponse.json({ published, closed, spawned });
}
