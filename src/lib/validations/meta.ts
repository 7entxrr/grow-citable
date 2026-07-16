import { z } from "zod";

export const campaignObjectiveSchema = z.enum([
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_APP_PROMOTION",
  "OUTCOME_SALES",
]);

export const createCampaignSchema = z
  .object({
    name: z.string().min(1, "Campaign name is required").max(200),
    objective: campaignObjectiveSchema,
    budgetType: z.enum(["daily", "lifetime"]),
    dailyBudget: z.number().min(100).optional(),
    lifetimeBudget: z.number().min(100).optional(),
    startTime: z.string().optional(),
    stopTime: z.string().optional(),
    scheduleType: z.enum(["now", "custom"]).default("now"),
    endType: z.enum(["ongoing", "custom"]).default("ongoing"),
  })
  .refine(
    (d) =>
      d.budgetType === "daily" ? d.dailyBudget != null : d.lifetimeBudget != null,
    { message: "Budget amount is required", path: ["dailyBudget"] },
  );

export const createAdSetSchema = z.object({
  name: z.string().min(1).max(200),
  campaignId: z.string().min(1),
  countries: z.array(z.string()).min(1, "Select at least one country"),
  ageMin: z.number().min(18).max(65),
  ageMax: z.number().min(18).max(65),
  genders: z.array(z.number()).optional(),
  interests: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional(),
  placementType: z.enum(["automatic", "manual"]).default("automatic"),
  placements: z.array(z.string()).optional(),
  dailyBudget: z.number().min(100),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const createCreativeSchema = z.object({
  name: z.string().min(1).max(200),
  pageId: z.string().min(1),
  format: z.enum(["image", "video", "carousel", "collection"]),
  imageHash: z.string().min(1, "Upload an image first"),
  primaryText: z.string().min(1).max(500),
  headline: z.string().min(1).max(40),
  description: z.string().max(30).optional(),
  destinationUrl: z.string().url(),
  ctaType: z.enum([
    "LEARN_MORE",
    "SHOP_NOW",
    "SIGN_UP",
    "BOOK_NOW",
    "CONTACT_US",
    "DOWNLOAD",
  ]),
});

export const createAdAccountSchema = z.object({
  businessId: z.string().min(1, "Pick a Business Manager"),
  name: z.string().min(1, "Account name is required").max(80),
  currency: z
    .string()
    .length(3, "ISO currency code (e.g. INR, USD)")
    .toUpperCase(),
  timezoneId: z.number().int().positive(),
  endAdvertiser: z.string().min(1, "End advertiser is required"),
  mediaAgency: z.string().optional(),
  partner: z.string().optional(),
});

export const createAdSchema = z.object({
  name: z.string().min(1).max(200),
  adSetId: z.string().min(1),
  creativeId: z.string().min(1),
});

export type CreateCampaignForm = z.infer<typeof createCampaignSchema>;
export type CreateAdSetForm = z.infer<typeof createAdSetSchema>;
export type CreateCreativeForm = z.infer<typeof createCreativeSchema>;
export type CreateAdForm = z.infer<typeof createAdSchema>;
export type CreateAdAccountForm = z.infer<typeof createAdAccountSchema>;
