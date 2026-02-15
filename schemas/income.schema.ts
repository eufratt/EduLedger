import { z } from "zod"

export const incomeCreateSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  fundingSourceId: z.coerce.number().int().positive(), // <-- WAJIB
  amount: z.coerce.number().int().positive(),
  date: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
})

export const incomeListSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  fundingSourceId: z.coerce.number().int().positive().optional(), // filter opsional
})