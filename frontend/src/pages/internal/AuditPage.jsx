import { Card } from "antd";
import { PageHeader } from "../../components/GeneralComponents";
import { AuditTimeline } from "../../components/DecisionComponents";
export default function AuditPage() { return <div className="internal-page"><PageHeader eyebrow="Transparencia" title="Auditoría" description="Consulta quién hizo cada cambio y cuándo ocurrió." /><Card className="detail-card"><AuditTimeline items={[{ action: "Solicitud recibida", actor: "Sistema", date: "08/11/2026 · 10:42" }, { action: "Solicitud asignada para revisión", actor: "Carlos Rodríguez · Oficial de crédito", date: "08/11/2026 · 11:15" }, { action: "Documento marcado como pendiente", actor: "Carlos Rodríguez · Oficial de crédito", date: "09/11/2026 · 08:25" }]} /></Card></div>; }
