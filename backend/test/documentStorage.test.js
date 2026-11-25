import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const storageDirectory = await mkdtemp(path.join(os.tmpdir(), "microcredito-documents-"));
process.env.DOCUMENT_STORAGE_PATH = storageDirectory;
const { storeReconsiderationDocuments, readStoredDocument, removeStoredDocuments } = await import("../src/services/documentStorage.service.js");

after(() => rm(storageDirectory, { recursive: true, force: true }));

test("guarda, lee y elimina un documento PDF validado", async () => {
  const pdf = Buffer.from("%PDF-1.7\ncontenido de prueba");
  const [stored] = await storeReconsiderationDocuments([{
    name: "soporte.pdf",
    mimeType: "application/pdf",
    contentBase64: pdf.toString("base64")
  }]);

  assert.equal(stored.originalName, "soporte.pdf");
  assert.deepEqual(await readStoredDocument(stored.storedName), pdf);
  await removeStoredDocuments([stored]);
  await assert.rejects(() => readStoredDocument(stored.storedName), (error) => error.status === 404);
});

test("rechaza documentos cuyo contenido no coincide con el tipo declarado", async () => {
  await assert.rejects(() => storeReconsiderationDocuments([{
    name: "falso.pdf",
    mimeType: "application/pdf",
    contentBase64: Buffer.from("esto no es PDF").toString("base64")
  }]), (error) => error.status === 400);
});

test("limita la cantidad de documentos por reconsideración", async () => {
  await assert.rejects(() => storeReconsiderationDocuments([{}, {}, {}, {}]), (error) => error.status === 400);
});
