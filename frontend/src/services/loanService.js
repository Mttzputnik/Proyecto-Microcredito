import { mockLoan } from "../mocks/data";
const wait = (data, delay = 300) => new Promise((resolve) => setTimeout(() => resolve(data), delay));
export const loanService = { getMine: () => wait(mockLoan) };
