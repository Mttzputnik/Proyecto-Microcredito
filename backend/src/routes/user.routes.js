import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS, ROLES } from "../domain/roles.js";
import { createUserSchema } from "../validators/auth.validator.js";
import { httpError, parseOrThrow } from "../utils/httpError.js";
import { writeAudit } from "../services/audit.service.js";
import { assignPendingApplications } from "../services/applicationAssignment.service.js";

const router = Router();
router.use(authenticate, authorize(...PERMISSIONS.manageUsers));

const publicUser = { id: true, firstName: true, lastName: true, email: true, role: true, active: true, createdAt: true };

// GET /api/users  (solo ADMIN)
router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "desc" } });
  res.json({ success: true, data: users });
});

// POST /api/users  (solo ADMIN) crea un usuario interno y deja constancia atómica.
router.post("/", async (req, res) => {
  const data = parseOrThrow(createUserSchema, req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw httpError(409, "Ya existe un usuario con ese correo.");

  const { password, ...rest } = data;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { ...rest, passwordHash },
      select: publicUser
    });

    await writeAudit(tx, {
      actorId: req.user.id,
      action: "USER_CREATED",
      entityType: "User",
      entityId: created.id,
      description: `Usuario interno creado con rol ${created.role}`,
      metadata: { role: created.role, active: created.active }
    });

    // Si se habilita un oficial, el reprocesamiento de la cola y sus eventos
    // quedan en la misma transacción que la creación del usuario.
    if (created.role === ROLES.CREDIT_OFFICER && created.active) {
      await assignPendingApplications(tx);
    }
    return created;
  });

  res.status(201).json({ success: true, data: user });
});

export default router;
