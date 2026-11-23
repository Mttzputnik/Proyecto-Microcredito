// Bootstrap local del PRIMER administrador. No expone un endpoint HTTP público.
// Uso desde backend: npm run admin:bootstrap
import "dotenv/config";
import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const rl = readline.createInterface({ input, output, terminal: Boolean(input.isTTY) });
let hideInput = false;
const writeToOutput = rl._writeToOutput.bind(rl);
rl._writeToOutput = (value) => {
  if (!hideInput) writeToOutput(value);
};

function question(prompt, hidden = false) {
  hideInput = hidden;
  return new Promise((resolve) => rl.question(prompt, (answer) => {
    hideInput = false;
    if (hidden) output.write("\n");
    resolve(answer);
  }));
}

try {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    throw new Error("Ya existe un administrador. El bootstrap solo se permite una vez.");
  }

  const firstName = (await question("Nombre: ")).trim();
  const lastName = (await question("Apellido: ")).trim();
  const email = (await question("Correo del administrador: ")).trim().toLowerCase();
  const password = await question("Contraseña (8-72 caracteres): ", true);
  const confirmation = await question("Confirma la contraseña: ", true);

  if (firstName.length < 2 || firstName.length > 80) throw new Error("El nombre debe tener entre 2 y 80 caracteres.");
  if (lastName.length < 2 || lastName.length > 100) throw new Error("El apellido debe tener entre 2 y 100 caracteres.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("El correo no es válido.");
  if (password.length < 8 || password.length > 72) throw new Error("La contraseña debe tener entre 8 y 72 caracteres.");
  if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Ya existe un usuario con ese correo.");

  // Revalidar antes de insertar para evitar crear otro ADMIN si el script se ejecuta simultáneamente.
  const adminCountBeforeCreate = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCountBeforeCreate > 0) throw new Error("Ya existe un administrador. No se hizo ningún cambio.");

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN"
    },
    select: { id: true, email: true, role: true }
  });
  console.log(`Administrador inicial creado correctamente: ${user.email}`);
} catch (error) {
  console.error("No se pudo inicializar el administrador:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await prisma.$disconnect();
}