// Crea el PRIMER usuario administrador (las demás cuentas las crea ese admin desde POST /api/users).
// Uso, desde la carpeta backend:   node scripts/seed-admin.js
// Pregunta correo y contraseña por la terminal. Si el correo ya existe, no hace nada.
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const rl = readline.createInterface({ input, output });
try {
  const email = (await rl.question("Correo del administrador: ")).trim().toLowerCase();
  const password = await rl.question("Contraseña (mínimo 8 caracteres; se verá al escribirla): ");

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("El correo no es válido.");
  if (password.length < 8 || password.length > 72) throw new Error("La contraseña debe tener entre 8 y 72 caracteres.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ya existe un usuario con el correo ${email}. No se hizo ningún cambio.`);
  } else {
    const user = await prisma.user.create({
      data: {
        firstName: "Administrador",
        lastName: "Sistema",
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: "ADMIN"
      }
    });
    console.log(`Administrador creado: ${user.email}`);
  }
} catch (error) {
  console.error("No se pudo crear el administrador:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}
