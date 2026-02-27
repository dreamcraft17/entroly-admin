import { z } from "zod";

const CampaignBaseSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  targetPoiTypes: z.array(z.enum(["ACC", "TTD", "FNB"])).min(1),
  requiredPosts: z.number().int().min(1),
  creditReward: z.number().positive(),
  currency: z.enum(["IDR", "USD"]).default("IDR"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  maxParticipants: z.number().int().positive().optional(),
  maxTotalCredits: z.number().positive().optional(),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "MONTHLY"]).default("ONE_TIME"),
  autoPublish: z.boolean().default(false),
});

// Create: full validation including date range check
export const CampaignCreateSchema = CampaignBaseSchema.refine(
  (d) => new Date(d.endDate) > new Date(d.startDate),
  { message: "endDate must be after startDate", path: ["endDate"] }
);

// Update: partial fields — .partial() must be called on base schema before .refine()
export const CampaignUpdateSchema = CampaignBaseSchema.partial();

export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof CampaignUpdateSchema>;
