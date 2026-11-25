import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { httpError } from "../utils/httpError.js";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_FILES = 3;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORAGE_DIRECTORY = path.resolve(MODULE_DIRECTORY, "../../storage/private-documents");
const STORAGE_DIRECTORY = path.resolve(process.env.DOCUMENT_STORAGE_PATH || DEFAULT_STORAGE_DIRECTORY);

function decodeAndValidate(document) {
  if (!document || typeof document !== "object") throw httpError(400, "Uno de los documentos no tiene un formato válido.");
  const { name, mimeType, contentBase64 } = document;
  if (typeof name !== "string" || !name.trim() || name.length > 180) throw httpError(400, "El nombre de uno de los documentos no es válido.");
  if (!ALLOWED_TYPES.has(mimeType)) throw httpError(400, "Solo se permiten documentos PDF, JPG o PNG.");
  if (typeof contentBase64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) || contentBase64.length % 4 !== 0) {
    throw httpError(400, "El contenido de uno de los documentos no es válido.");
  }
  const buffer = Buffer.from(contentBase64, "base64");
  if (!buffer.length || buffer.length > MAX_FILE_SIZE) throw httpError(400, "Cada documento debe pesar máximo 4 MB.");
  const validSignature = mimeType === "application/pdf"
    ? buffer.subarray(0, 5).toString("ascii") === "%PDF-"
    : mimeType === "image/png"
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  if (!validSignature) throw httpError(400, "El contenido del archivo no coincide con su tipo declarado.");
  return {
    buffer,
    originalName: path.basename(name.trim()).replace(/[\\/\0]/g, "_"),
    mimeType,
    size: buffer.length
  };
}

export async function storeReconsiderationDocuments(documents = []) {
  if (!Array.isArray(documents) || documents.length > MAX_FILES) throw httpError(400, "Puedes adjuntar máximo 3 documentos.");
  if (documents.length === 0) return [];
  const stored = [];
  try {
    await mkdir(STORAGE_DIRECTORY, { recursive: true, mode: 0o700 });
    for (const document of documents) {
      const validated = decodeAndValidate(document);
      const storedName = randomUUID() + ".bin";
      const filePath = path.join(STORAGE_DIRECTORY, storedName);
      await writeFile(filePath, validated.buffer, { flag: "wx", mode: 0o600 });
      stored.push({ ...validated, storedName, filePath });
    }
    return stored;
  } catch (error) {
    await removeStoredDocuments(stored);
    throw error;
  }
}

export async function removeStoredDocuments(files = []) {
  await Promise.all(files.map((file) => unlink(file.filePath).catch(() => {})));
}

export async function readStoredDocument(storedName) {
  if (typeof storedName !== "string" || !/^[a-f0-9-]+\.bin$/i.test(storedName)) throw httpError(404, "Documento no encontrado.");
  try {
    return await readFile(path.join(STORAGE_DIRECTORY, storedName));
  } catch (error) {
    if (error.code === "ENOENT") throw httpError(404, "Documento no encontrado en el almacenamiento.");
    throw error;
  }
}
