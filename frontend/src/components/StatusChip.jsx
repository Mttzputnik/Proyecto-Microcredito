import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, StopOutlined } from "@ant-design/icons";
import { Tag } from "antd";

const config = {
  "Activo — al día": { icon: <CheckCircleOutlined />, color: "success", className: "status-ok" },
  "Con retraso leve": { icon: <ClockCircleOutlined />, color: "warning", className: "status-warning" },
  "En mora temprana": { icon: <AlertOutlined />, color: "orange", className: "status-orange" },
  "En mora establecida": { icon: <ExclamationCircleOutlined />, color: "error", className: "status-error" },
  "Reestructurado — activo": { icon: <ReloadOutlined />, color: "processing", className: "status-blue" },
  Castigado: { icon: <StopOutlined />, color: "default", className: "status-gray" },
};

export default function StatusChip({ status }) {
  const item = config[status] || { icon: <ClockCircleOutlined />, color: "default", className: "status-gray" };
  return <Tag icon={item.icon} color={item.color} className={`status-chip ${item.className}`}>{status}</Tag>;
}
