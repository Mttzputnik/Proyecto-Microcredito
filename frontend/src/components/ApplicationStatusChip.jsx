import { CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined, FileSearchOutlined, StopOutlined } from "@ant-design/icons";
import { Tag } from "antd";
const config = { SUBMITTED: ["Recibida", "processing", <ClockCircleOutlined />], UNDER_REVIEW: ["En revisión", "warning", <FileSearchOutlined />], APPROVED: ["Aprobada", "success", <CheckCircleOutlined />], REJECTED: ["Rechazada", "error", <StopOutlined />], CANCELLED: ["Cancelada", "default", <ExclamationCircleOutlined />] };
export default function ApplicationStatusChip({ status }) { const [label, color, icon] = config[status] || [status, "default", <ClockCircleOutlined />]; return <Tag icon={icon} color={color}>{label}</Tag>; }
