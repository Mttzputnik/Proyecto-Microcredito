const wait = (data, delay = 300) => new Promise((resolve) => setTimeout(() => resolve(data), delay));
export const policyService = { getActive: () => wait({ version: "2026.11", ageMinimum: 18, note: "Las demás reglas se configuran en el backend." }) };
