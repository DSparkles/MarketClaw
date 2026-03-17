export * from "./generated/api";
import { z } from "zod";

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  isAi: z.boolean(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
