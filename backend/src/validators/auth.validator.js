import { z } from "zod";
import { ALL_ROLES } from "../domain/roles.js";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200)
}).strict();

// bcrypt solo usa los primeros 72 bytes de la contraseña.
export const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
  role: z.enum(ALL_ROLES)
}).strict();
