import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { authenticate, signToken } from "../middleware/authenticate.js";
import { loginSchema } from "../validators/auth.validator.js";
import { httpError, parseOrThrow } from "../utils/httpError.js";
import { writeAudit } from "../services/audit.service.js";

const router = Router();

// Hash falso para gastar el mismo tiempo cuando el correo no existe (evita revelar qué correos existen).
const DUMMY_HASH = bcrypt.hashSync("no-es-una-contraseña-real", 10);

// POST /api/auth/login  { email, password } -> { token, user }
router.post("/login", async (req, res) => {
  const { email, password } = parseOrThrow(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !passwordOk) {
    throw httpError(401, "Correo o contraseña incorrectos.");
  }

  await writeAudit(prisma, {
    actorId: user.id,
    action: "USER_LOGIN",
    entityType: "User",
    entityId: user.id,
    description: `Inicio de sesión de ${user.email}`
  });

  res.json({
    success: true,
    data: {
      token: signToken(user),
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
    }
  });
});

// GET /api/auth/me  -> usuario de la sesión actual
router.get("/me", authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

export default router;
