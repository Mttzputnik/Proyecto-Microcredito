import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// El token se entrega una sola vez. En la base de datos solo se conserva su hash SHA-256.
export function createTrackingCredential() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashTrackingToken(token) };
}

export function hashTrackingToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function matchesTrackingToken(token, storedHash) {
  if (typeof token !== "string" || typeof storedHash !== "string" || !/^[a-f0-9]{64}$/i.test(storedHash)) {
    return false;
  }
  const supplied = Buffer.from(hashTrackingToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}


// Proyección pública deliberadamente mínima: nunca devuelve datos personales,
// financieros, documentos, oficial asignado ni el resultado interno de reconsideración.
export function toPublicTrackingStatus(application) {
  return {
    applicationNumber: application.applicationNumber,
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt
  };
}
