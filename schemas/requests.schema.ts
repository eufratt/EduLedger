import { z } from "zod"

export const CreateRequestSchema = z.object({
  title: z.string().trim().min(3, "title minimal 3 karakter").max(120, "title maksimal 120 karakter"),
  description: z.string().trim().max(2000, "description maksimal 2000 karakter").optional(),
  amountRequested: z.coerce.number().int("amountRequested harus integer").positive("amountRequested harus > 0"),
  categoryId: z.coerce.number().int().positive("categoryId invalid"),
  neededBy: z.string().datetime().optional(), // ISO string
})

export const AllowedStatus = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"])