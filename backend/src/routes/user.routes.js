import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { createUserSchema } from "../validators/auth.validator.js";
import { httpError, parseOrThrow } from "../utils/httpError.js";
import { writeAudit } from "../services/audit.service.js";

const router = Router();
router.use(authenticate, authorize(...PERMISSIONS.manageUsers));

const publicUser = { id: true, firstName: true, lastName: true, email: true, role: true, active: true, createdAt: true };

// GET /api/users  (solo ADMIN)
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: users });
});

// POST /api/users  (solo ADMIN) crea un usuario interno
router.post("/", async (req, res) => {
  const data = parseOrThrow(createUserSchema, req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw httpError(409, "Ya existe un usuario con ese correo.");

  const { password, ...rest } = data;
  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await bcrypt.hash(password, 10) },
    select: publicUser
  });
  await writeAudit(prisma, {
    actorId: req.user.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    description: `Usuario ${user.email} creado con rol ${user.role}`
  });
  res.status(201).json({ success: true, data: user });
});

export default router;
