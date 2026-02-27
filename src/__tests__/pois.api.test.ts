import { NextRequest } from "next/server";

// Mock auth
jest.mock("@/lib/auth", () => ({
  verifyAdminToken: jest.fn(),
  hasMinRole: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    poi: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    adminAuditLog: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { verifyAdminToken, hasMinRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockUser = { id: "user1", email: "admin@test.com", name: "Admin", adminRole: "OPERATOR" as const };

beforeEach(() => {
  jest.clearAllMocks();
  (verifyAdminToken as jest.Mock).mockResolvedValue(mockUser);
  (hasMinRole as jest.Mock).mockReturnValue(true);
});

describe("GET /api/admin/pois", () => {
  it("returns poi list", async () => {
    const { GET } = await import("@/app/api/admin/pois/route");
    const pois = [{ id: "1", name: "Starbucks", type: "FNB", market: "IDN" }];
    (prisma.poi.findMany as jest.Mock).mockResolvedValue(pois);

    const req = new NextRequest("http://localhost/api/admin/pois");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(pois);
  });

  it("returns 401 when unauthenticated", async () => {
    (verifyAdminToken as jest.Mock).mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/pois/route");
    const req = new NextRequest("http://localhost/api/admin/pois");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/pois/upload/commit", () => {
  it("returns 400 for missing idempotencyKey", async () => {
    const { POST } = await import("@/app/api/admin/pois/upload/commit/route");
    (prisma.adminAuditLog.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/pois/upload/commit", {
      method: "POST",
      body: JSON.stringify({ added: [], updated: [], deactivatedExternalIds: [] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("skips if idempotency key already committed", async () => {
    const { POST } = await import("@/app/api/admin/pois/upload/commit/route");
    (prisma.adminAuditLog.findFirst as jest.Mock).mockResolvedValue({ id: "existing" });

    const req = new NextRequest("http://localhost/api/admin/pois/upload/commit", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "key-123",
        added: [],
        updated: [],
        deactivatedExternalIds: [],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });

  it("commits changes in transaction", async () => {
    const { POST } = await import("@/app/api/admin/pois/upload/commit/route");
    (prisma.adminAuditLog.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(prisma));
    (prisma.poi.create as jest.Mock).mockResolvedValue({});
    (prisma.poi.updateMany as jest.Mock).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/admin/pois/upload/commit", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "key-456",
        added: [{ externalId: "e1", name: "POI 1", type: "FNB", market: "IDN" }],
        updated: [],
        deactivatedExternalIds: ["e2"],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.added).toBe(1);
    expect(body.deactivated).toBe(1);
  });
});
