/**
 * D-01: Template CRUD API Tests
 *
 * These tests verify that all endpoints return correct HTTP status codes
 * and that mutations write to AdminAuditLog.
 *
 * Run against a test DB:
 *   DATABASE_URL=postgresql://... npx jest src/__tests__/templates.api.test.ts
 */

import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:4017";
const OPERATOR_TOKEN = process.env.TEST_OPERATOR_TOKEN ?? "";
const VIEWER_TOKEN = process.env.TEST_VIEWER_TOKEN ?? "";

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const validTemplate = {
  name: "Test Template",
  category: "ACC",
  seedanceConfigJson: {
    variation_params: { style_variation: ["cinematic"] },
    duration_sec: 15,
    aspect_ratio: "9:16",
  },
  performanceTags: ["trending"],
  performanceScore: 85,
};

describe("GET /api/admin/templates", () => {
  it("returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with valid token", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates`, {
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("total");
  });
});

describe("POST /api/admin/templates", () => {
  it("returns 401 without auth", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validTemplate),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for VIEWER role", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates`, {
      method: "POST",
      headers: authHeaders(VIEWER_TOKEN),
      body: JSON.stringify(validTemplate),
    });
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid body", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates`, {
      method: "POST",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 201 and writes audit log", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates`, {
      method: "POST",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify(validTemplate),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data).toHaveProperty("id");

    // Verify audit log was written
    const log = await prisma.adminAuditLog.findFirst({
      where: { entityType: "TEMPLATE", entityId: json.data.id, actionType: "CREATE" },
    });
    expect(log).not.toBeNull();

    // Cleanup
    await prisma.adminAuditLog.deleteMany({ where: { entityId: json.data.id } });
    await prisma.template.delete({ where: { id: json.data.id } });
  });
});

describe("PUT /api/admin/templates/[id]", () => {
  let templateId: string;

  beforeAll(async () => {
    const t = await prisma.template.create({
      data: { ...validTemplate, createdBy: "test" },
    });
    templateId = t.id;
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({ where: { entityId: templateId } });
    await prisma.template.deleteMany({ where: { id: templateId } });
  });

  it("returns 404 for unknown id", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates/nonexistent`, {
      method: "PUT",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 and writes audit log", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates/${templateId}`, {
      method: "PUT",
      headers: authHeaders(OPERATOR_TOKEN),
      body: JSON.stringify({ name: "Updated Name" }),
    });
    expect(res.status).toBe(200);

    const log = await prisma.adminAuditLog.findFirst({
      where: { entityType: "TEMPLATE", entityId: templateId, actionType: "UPDATE" },
    });
    expect(log).not.toBeNull();
    expect(log?.beforeValue).toBeDefined();
    expect(log?.afterValue).toBeDefined();
  });
});

describe("PATCH /api/admin/templates/[id]/archive", () => {
  let templateId: string;

  beforeAll(async () => {
    const t = await prisma.template.create({
      data: { ...validTemplate, name: "Archive Test", createdBy: "test" },
    });
    templateId = t.id;
  });

  afterAll(async () => {
    await prisma.adminAuditLog.deleteMany({ where: { entityId: templateId } });
    await prisma.template.deleteMany({ where: { id: templateId } });
  });

  it("returns 200 and marks template archived", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates/${templateId}/archive`, {
      method: "PATCH",
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.isActive).toBe(false);
    expect(json.data.archivedAt).not.toBeNull();
  });

  it("returns 409 if already archived", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/templates/${templateId}/archive`, {
      method: "PATCH",
      headers: authHeaders(OPERATOR_TOKEN),
    });
    expect(res.status).toBe(409);
  });
});
