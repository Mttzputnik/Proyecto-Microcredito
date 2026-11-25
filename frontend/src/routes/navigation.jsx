import {
  AlertOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileSearchOutlined,
  RetweetOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const CREDIT_OFFICERS = ["CREDIT_OFFICER", "oficial_credito"];
const INTERNAL_ACTORS = [...CREDIT_OFFICERS, "analista_riesgo", "administrativo", "comite_supervisor"];
const ADMINISTRATIVE = ["administrativo"];

export const internalNavigation = [
  { key: "/internal", label: "Resumen", icon: <DashboardOutlined />, roles: INTERNAL_ACTORS },
  { key: "/internal/applications", label: "Solicitudes", icon: <FileSearchOutlined />, roles: CREDIT_OFFICERS },
  { key: "/internal/reconsiderations", label: "Reconsideraciones", icon: <RetweetOutlined />, roles: CREDIT_OFFICERS },
  { key: "/internal/applicants", label: "Solicitantes", icon: <TeamOutlined />, roles: CREDIT_OFFICERS },
  { key: "/internal/policies", label: "Políticas", icon: <SafetyCertificateOutlined />, roles: ["analista_riesgo", ...CREDIT_OFFICERS] },
  { key: "/internal/loans", label: "Préstamos y pagos", icon: <DollarOutlined />, roles: ADMINISTRATIVE },
  { key: "/internal/restructurings", label: "Reestructuraciones", icon: <DollarOutlined />, roles: [...ADMINISTRATIVE, ...CREDIT_OFFICERS, "analista_riesgo", "comite_supervisor"] },
  { key: "/internal/arrears", label: "Cartera en mora", icon: <AlertOutlined />, roles: ADMINISTRATIVE },
  { key: "/internal/audit", label: "Auditoría", icon: <ProfileOutlined />, roles: ADMINISTRATIVE },
  { key: "/internal/reports", label: "Reportes", icon: <BarChartOutlined />, roles: ["administrativo", "comite_supervisor"] },
];

export const roleHome = (role) => role === "solicitante" ? "/applicant" : role ? "/internal" : "/login";
