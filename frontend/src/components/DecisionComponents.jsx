import { ExclamationCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import { Modal, Timeline } from "antd";

export function JustificationBlock({ title = "Justificación de la decisión", children }) {
  return <div className="justification-block"><strong>{title}</strong><p>{children}</p></div>;
}

export function AuditTimeline({ items = [] }) {
  return <div className="audit-timeline"><Timeline items={items.map((item) => ({ dot: <HistoryOutlined />, children: <div><strong>{item.action}</strong><span>{item.actor} · {item.date}</span></div> }))} /></div>;
}

export function ConfirmModal({ open, title, content, onConfirm, onCancel, confirmText = "Confirmar acción" }) {
  return <Modal open={open} title={<span><ExclamationCircleOutlined /> {title}</span>} onOk={onConfirm} onCancel={onCancel} okText={confirmText} cancelText="Volver" okButtonProps={{ danger: true }}>{content}</Modal>;
}
