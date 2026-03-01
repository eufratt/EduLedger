import { z } from "zod"

export const CreateRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(120, "Judul maksimal 120 karakter"),
  description: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.trim().length === 0 || v.trim().length >= 10, {
      message: "Deskripsi minimal 10 karakter (atau kosongkan)",
    }),
  amountRequested: z.coerce
    .number()
    .int("Jumlah dana harus berupa bilangan bulat")
    .positive("Jumlah dana harus lebih besar dari 0"),
  neededBy: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return date >= now;
    }, "Tanggal dibutuhkan tidak boleh di masa lalu"),
})

export const AllowedStatus = z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"])