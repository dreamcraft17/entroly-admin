import { z } from "zod";

const POI_TYPES = ["ACC", "TTD", "FNB"] as const;

export const createScriptSchema = z.object({
  text: z.string().min(1).max(500),
  poiType: z.enum(POI_TYPES),
  language: z.string().min(2).max(10),
  market: z.string().min(2).max(50),
});

export const updateScriptSchema = createScriptSchema.partial();

export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
