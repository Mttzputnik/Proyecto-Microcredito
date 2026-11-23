// Reutiliza el registro de identidad sin permitir que el formulario público lo sobrescriba.
// Los datos enviados para cada solicitud se conservan en ApplicationApplicantSnapshot.
export async function getOrCreateApplicantForSubmission(tx, applicantData) {
  const existing = await tx.applicant.findUnique({
    where: { documentNumber: applicantData.documentNumber }
  });

  if (existing) return existing;

  return tx.applicant.create({ data: applicantData });
}
