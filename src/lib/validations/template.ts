import { z } from "zod";

// seedance_config_json must have at minimum: variation_params
const seedanceConfigSchema = z.object({
  variation_params: z.record(z.string(), z.unknown()),
  style: z.string().optional(),
  duration_sec: z.number().positive().optional(),
  aspect_ratio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  resolution: z.string().optional(),
  motion_level: z.enum(["low", "medium", "high"]).optional(),
}).passthrough();

const fallbackVendorConfigSchema = z.object({
  vendor: z.string(),
  endpoint: z.string().url(),
  params: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  seedanceConfigJson: seedanceConfigSchema,
  fallbackVendorConfigJson: fallbackVendorConfigSchema.optional().nullable(),
  sampleThumbnailUrl: z.string().url().optional().nullable(),
  performanceTags: z.array(z.string()).default([]),
  performanceScore: z.number().min(0).max(100).optional().nullable(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
