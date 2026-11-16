import { applicantService } from "./applicantService";
export const userService = { list: applicantService.list, getById: applicantService.getById, update: applicantService.update };
