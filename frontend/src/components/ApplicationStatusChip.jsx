import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Tag } from "antd";

const config = {
  PENDING_ASSIGNMENT: ["Pendiente de asignación", "default", <ClockCircleOutlined />],
  SUBMITTED: ["Recibida", "processing", <ClockCircleOutlined />],
  UNDER_REVIEW: ["En revisión", "warning", <FileSearchOutlined />],
  NEEDS_INFORMATION: ["Requiere información", "warning", <ExclamationCircleOutlined />],
  APPROVED: ["Aprobada", "success", <CheckCircleOutlined />],
  APPROVED_WITH_CONDITIONS: ["Aprobada con condiciones", "processing", <CheckCircleOutlined />],
  REJECTED: ["Rechazada", "error", <StopOutlined />],
  CANCELLED: ["Cancelada", "default", <ExclamationCircleOutlined />],
};

export default function ApplicationStatusChip({ status }) {
  const [label, color, icon] = config[status] || [
    status,
    "default",
    <ClockCircleOutlined />,
  ];
  return <Tag icon={icon} color={color}>{label}</Tag>;
}
