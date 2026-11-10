import { Button, Empty } from "antd";

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function EmptyState({ title = "Aún no hay información", description, action }) {
  return <div className="empty-state"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span><strong>{title}</strong><br />{description}</span>} />{action && <Button type="primary" onClick={action.onClick}>{action.label}</Button>}</div>;
}
