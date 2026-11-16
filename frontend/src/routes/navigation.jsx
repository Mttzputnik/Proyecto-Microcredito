import { BarChartOutlined, DashboardOutlined, FileSearchOutlined, ProfileOutlined, SafetyCertificateOutlined } from "@ant-design/icons";

export const internalNavigation = [
  { key: "/internal", label: "Resumen", icon: <DashboardOutlined />, roles: ["oficial_credito", "analista_riesgo", "administrativo", "comite_supervisor", "CREDIT_OFFICER", "ADMIN", "AUDITOR"] },
  { key: "/internal/applications", label: "Solicitudes", icon: <FileSearchOutlined />, roles: ["oficial_credito", "analista_riesgo", "administrativo", "comite_supervisor", "CREDIT_OFFICER", "ADMIN", "AUDITOR"] },
  { key: "/internal/policies", label: "Políticas", icon: <SafetyCertificateOutlined />, roles: ["analista_riesgo", "comite_supervisor", "ADMIN", "AUDITOR"] },
  { key: "/internal/audit", label: "Auditoría", icon: <ProfileOutlined />, roles: ["administrativo", "comite_supervisor", "ADMIN", "AUDITOR"] },
  { key: "/internal/reports", label: "Reportes", icon: <BarChartOutlined />, roles: ["administrativo", "comite_supervisor", "ADMIN", "AUDITOR"] },
];

export const roleHome = (role) => role === "solicitante" ? "/applicant" : role ? "/internal" : "/login";
