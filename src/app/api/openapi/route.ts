import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "ENTROPI Admin API",
    version: "1.0.0",
    description: "Admin Panel REST API for Templates, Script Library, POIs, and Campaigns.",
  },
  servers: [{ url: "/api/admin", description: "Admin API base path" }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "admin_token",
        description: "HS256 JWT issued by POST /api/auth/login",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "RS256 JWT issued by SSO",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "object" },
        },
        required: ["error"],
      },
      SeedanceConfig: {
        type: "object",
        required: ["variation_params"],
        properties: {
          variation_params: { type: "object", additionalProperties: true },
          style: { type: "string", example: "tiktok_go" },
          duration_sec: { type: "number", example: 15 },
          aspect_ratio: { type: "string", enum: ["9:16", "16:9", "1:1"] },
          resolution: { type: "string", example: "1080p" },
          motion_level: { type: "string", enum: ["low", "medium", "high"] },
        },
        additionalProperties: true,
      },
      Template: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          category: { type: "string", enum: ["ACC", "TTD", "FNB", "GENERAL"] },
          seedanceConfigJson: { $ref: "#/components/schemas/SeedanceConfig" },
          fallbackVendorConfigJson: { type: "object", nullable: true },
          sampleThumbnailUrl: { type: "string", format: "uri", nullable: true },
          performanceTags: { type: "array", items: { type: "string" } },
          performanceScore: { type: "number", minimum: 0, maximum: 100, nullable: true },
          isActive: { type: "boolean" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TemplateCreate: {
        type: "object",
        required: ["name", "category", "seedanceConfigJson"],
        properties: {
          name: { type: "string", maxLength: 100 },
          category: { type: "string", enum: ["ACC", "TTD", "FNB", "GENERAL"] },
          seedanceConfigJson: { $ref: "#/components/schemas/SeedanceConfig" },
          fallbackVendorConfigJson: { type: "object", nullable: true },
          sampleThumbnailUrl: { type: "string", format: "uri", nullable: true },
          performanceTags: { type: "array", items: { type: "string" }, default: [] },
          performanceScore: { type: "number", minimum: 0, maximum: 100, nullable: true },
        },
      },
      Script: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string", maxLength: 500 },
          poiType: { type: "string", enum: ["ACC", "TTD", "FNB"] },
          language: { type: "string", example: "id" },
          market: { type: "string", example: "IDN" },
          usageCount: { type: "integer" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ScriptCreate: {
        type: "object",
        required: ["text", "poiType", "language", "market"],
        properties: {
          text: { type: "string", minLength: 1, maxLength: 500 },
          poiType: { type: "string", enum: ["ACC", "TTD", "FNB"] },
          language: { type: "string", example: "id" },
          market: { type: "string", example: "IDN" },
        },
      },
      Poi: {
        type: "object",
        properties: {
          id: { type: "string" },
          externalId: { type: "string", nullable: true },
          name: { type: "string" },
          type: { type: "string", enum: ["ACC", "TTD", "FNB"] },
          market: { type: "string", enum: ["IDN", "US", "SGP"] },
          address: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PoiUploadDryRun: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              added: { type: "integer" },
              updated: { type: "integer" },
              deactivated: { type: "integer" },
              errors: { type: "integer" },
            },
          },
          added: { type: "array", items: { $ref: "#/components/schemas/Poi" } },
          updated: { type: "array", items: { type: "object" } },
          deactivated: { type: "array", items: { type: "object" } },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                row: { type: "integer" },
                externalId: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      Campaign: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          targetPoiTypes: { type: "array", items: { type: "string", enum: ["ACC", "TTD", "FNB"] } },
          requiredPosts: { type: "integer" },
          creditReward: { type: "string", description: "DECIMAL(18,4) as string" },
          currency: { type: "string", enum: ["IDR", "USD"] },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          maxParticipants: { type: "integer", nullable: true },
          maxTotalCredits: { type: "string", nullable: true },
          totalCredited: { type: "string" },
          frequency: { type: "string", enum: ["ONE_TIME", "WEEKLY", "MONTHLY"] },
          status: { type: "string", enum: ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"] },
          autoPublish: { type: "boolean" },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CampaignCreate: {
        type: "object",
        required: ["name", "targetPoiTypes", "requiredPosts", "creditReward", "startDate", "endDate"],
        properties: {
          name: { type: "string", maxLength: 120 },
          description: { type: "string", maxLength: 1000 },
          targetPoiTypes: { type: "array", items: { type: "string", enum: ["ACC", "TTD", "FNB"] }, minItems: 1 },
          requiredPosts: { type: "integer", minimum: 1 },
          creditReward: { type: "number", minimum: 0 },
          currency: { type: "string", enum: ["IDR", "USD"], default: "IDR" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          maxParticipants: { type: "integer", minimum: 1 },
          maxTotalCredits: { type: "number", minimum: 0 },
          frequency: { type: "string", enum: ["ONE_TIME", "WEEKLY", "MONTHLY"], default: "ONE_TIME" },
          autoPublish: { type: "boolean", default: false },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    // ---- Templates ----
    "/templates": {
      get: {
        summary: "List all templates",
        tags: ["Templates"],
        parameters: [
          { name: "includeArchived", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: {
            description: "Array of templates",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Template" } } } },
          },
          401: { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        summary: "Create a template",
        tags: ["Templates"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TemplateCreate" } } },
        },
        responses: {
          201: { description: "Created template", content: { "application/json": { schema: { $ref: "#/components/schemas/Template" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Requires OPERATOR role" },
        },
      },
    },
    "/templates/{id}": {
      get: {
        summary: "Get template by ID",
        tags: ["Templates"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Template", content: { "application/json": { schema: { $ref: "#/components/schemas/Template" } } } },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "Update template",
        tags: ["Templates"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TemplateCreate" } } },
        },
        responses: {
          200: { description: "Updated template" },
          400: { description: "Validation error" },
          403: { description: "Requires OPERATOR role" },
          404: { description: "Not found" },
        },
      },
    },
    "/templates/{id}/archive": {
      patch: {
        summary: "Archive a template (soft delete)",
        tags: ["Templates"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Archived template" },
          403: { description: "Requires OPERATOR role" },
          404: { description: "Not found" },
          409: { description: "Already archived" },
        },
      },
    },

    // ---- Scripts ----
    "/scripts": {
      get: {
        summary: "List all scripts",
        tags: ["Script Library"],
        parameters: [
          { name: "poiType", in: "query", schema: { type: "string", enum: ["ACC", "TTD", "FNB"] } },
          { name: "language", in: "query", schema: { type: "string" } },
          { name: "market", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Array of scripts", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Script" } } } } },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create a script",
        tags: ["Script Library"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ScriptCreate" } } },
        },
        responses: {
          201: { description: "Created script" },
          400: { description: "Validation error" },
          403: { description: "Requires OPERATOR role" },
        },
      },
    },
    "/scripts/{id}": {
      get: {
        summary: "Get script by ID",
        tags: ["Script Library"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Script", content: { "application/json": { schema: { $ref: "#/components/schemas/Script" } } } },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "Update script",
        tags: ["Script Library"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ScriptCreate" } } },
        },
        responses: {
          200: { description: "Updated script" },
          403: { description: "Requires OPERATOR role" },
          404: { description: "Not found" },
        },
      },
      delete: {
        summary: "Delete script",
        tags: ["Script Library"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Deleted" },
          403: { description: "Requires OPERATOR role" },
          404: { description: "Not found" },
        },
      },
    },

    // ---- POIs ----
    "/pois": {
      get: {
        summary: "List POIs",
        tags: ["POIs"],
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["ACC", "TTD", "FNB"] } },
          { name: "market", in: "query", schema: { type: "string", enum: ["IDN", "US", "SGP"] } },
          { name: "active", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: { description: "Array of POIs", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Poi" } } } } },
        },
      },
    },
    "/pois/upload": {
      post: {
        summary: "Dry-run CSV/XLSX upload — returns diff without writing",
        tags: ["POIs"],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: { type: "string", format: "binary", description: ".csv or .xlsx. Columns: externalId, name, type, market, address, city" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Dry-run diff", content: { "application/json": { schema: { $ref: "#/components/schemas/PoiUploadDryRun" } } } },
          400: { description: "Invalid file" },
          403: { description: "Requires OPERATOR role" },
        },
      },
    },
    "/pois/upload/commit": {
      post: {
        summary: "Commit dry-run changes to DB (idempotent)",
        tags: ["POIs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["idempotencyKey", "added", "updated", "deactivatedExternalIds"],
                properties: {
                  idempotencyKey: { type: "string", format: "uuid" },
                  added: { type: "array", items: { type: "object" } },
                  updated: { type: "array", items: { type: "object" } },
                  deactivatedExternalIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Commit result with counts" },
          400: { description: "Invalid payload" },
          403: { description: "Requires OPERATOR role" },
        },
      },
    },

    // ---- Campaigns ----
    "/campaigns": {
      get: {
        summary: "List campaigns",
        tags: ["Campaigns"],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"] } },
        ],
        responses: {
          200: { description: "Array of campaigns", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Campaign" } } } } },
        },
      },
      post: {
        summary: "Create campaign",
        tags: ["Campaigns"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CampaignCreate" } } },
        },
        responses: {
          201: { description: "Created campaign", content: { "application/json": { schema: { $ref: "#/components/schemas/Campaign" } } } },
          400: { description: "Validation error" },
          403: { description: "Requires OPERATOR role" },
        },
      },
    },
    "/campaigns/{id}": {
      get: {
        summary: "Get campaign by ID",
        tags: ["Campaigns"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Campaign", content: { "application/json": { schema: { $ref: "#/components/schemas/Campaign" } } } },
          404: { description: "Not found" },
        },
      },
      put: {
        summary: "Update campaign (not allowed if CLOSED)",
        tags: ["Campaigns"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CampaignCreate" } } },
        },
        responses: {
          200: { description: "Updated campaign" },
          403: { description: "Requires OPERATOR role" },
          404: { description: "Not found" },
          409: { description: "Cannot edit a closed campaign" },
        },
      },
      patch: {
        summary: "Campaign status transition",
        tags: ["Campaigns"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["publish", "pause", "close"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated campaign" },
          400: { description: "Invalid action" },
          409: { description: "Invalid status transition" },
        },
      },
    },
    "/campaigns/cron": {
      post: {
        summary: "Cron: auto-publish + budget cap close + spawn next cycle",
        tags: ["Campaigns"],
        description: "Protected by x-cron-secret header. Called by external scheduler.",
        security: [],
        parameters: [
          { name: "x-cron-secret", in: "header", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Lists of published/closed/spawned campaign IDs" },
          401: { description: "Invalid cron secret" },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: { "Content-Type": "application/json" },
  });
}
