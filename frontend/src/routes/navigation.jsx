import {
  BarChartOutlined, DashboardOutlined, FileSearchOutlined, ProfileOutlined,
  SafetyCertificateOutlined, TeamOutlined,
} from "@ant-design/icons";
import { ROLES } from "../domain/roles";

export const internalNavigation = [
  { key: "/internal", label: "Resumen", icon: <DashboardOutlined />, roles: [ROLES.ADMIN, ROLES.CREDIT_OFFICER, ROLES.RISK_ANALYST, ROLES.COMMITTEE_SUPERVISOR, ROLES.AUDITOR] },
  { key: "/internal/applications", label: "Solicitudes", icon: <FileSearchOutlined />, roles: [ROLES.ADMIN, ROLES.CREDIT_OFFICER, ROLES.RISK_ANALYST, ROLES.COMMITTEE_SUPERVISOR, ROLES.AUDITOR] },
  { key: "/internal/applicants", label: "Solicitantes", icon: <TeamOutlined />, roles: [ROLES.ADMIN, ROLES.CREDIT_OFFICER, ROLES.RISK_ANALYST, ROLES.COMMITTEE_SUPERVISOR, ROLES.AUDITOR] },
  { key: "/internal/policies", label: "Políticas", icon: <SafetyCertificateOutlined />, roles: [ROLES.ADMIN, ROLES.CREDIT_OFFICER, ROLES.RISK_ANALYST, ROLES.COMMITTEE_SUPERVISOR, ROLES.AUDITOR] },
  { key: "/internal/audit", label: "Auditoría", icon: <ProfileOutlined />, roles: [ROLES.ADMIN, ROLES.AUDITOR] },
  { key: "/internal/reports", label: "Reportes", icon: <BarChartOutlined />, roles: [ROLES.ADMIN, ROLES.AUDITOR, ROLES.COMMITTEE_SUPERVISOR] },
];

export const roleHome = (role) => role === ROLES.APPLICANT ? "/applicant" : role ? "/internal" : "/login";
