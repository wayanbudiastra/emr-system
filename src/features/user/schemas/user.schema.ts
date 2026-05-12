import { z } from "zod";

export const createUserSchema = z
  .object({
    nama:         z.string().min(3, "Nama minimal 3 karakter"),
    email:        z.string().email("Format email tidak valid"),
    password:     z.string().min(8, "Password minimal 8 karakter"),
    role:         z.enum(["SUPER_ADMIN", "ADMISSION", "KASIR", "DOKTER", "PERAWAT", "APOTEKER"]),
    nip:          z.string().optional(),
    telepon:      z.string().optional(),
    noSIP:        z.string().optional(),
    spesialisasi: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "DOKTER" && !data.noSIP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nomor SIP wajib diisi untuk Dokter",
        path: ["noSIP"],
      });
    }
  });

export const updateUserSchema = z
  .object({
    nama:         z.string().min(3).optional(),
    email:        z.string().email().optional(),
    role:         z.enum(["SUPER_ADMIN", "ADMISSION", "KASIR", "DOKTER", "PERAWAT", "APOTEKER"]).optional(),
    nip:          z.string().optional(),
    telepon:      z.string().optional(),
    isActive:     z.boolean().optional(),
    sip:          z.string().optional(),
    spesialisasi: z.string().optional(),
    poliId:       z.string().optional(),
  });

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[A-Z]/, "Harus mengandung huruf kapital")
      .regex(/[0-9]/, "Harus mengandung angka"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
