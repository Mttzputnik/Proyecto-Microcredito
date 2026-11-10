import { Button, Card, Table } from "antd";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import StatusChip from "../../components/StatusChip";
import { mockApplications } from "../../mocks/data";
const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const columns = [{ title: "Solicitud", dataIndex: "id", key: "id", render: (value) => <strong>{value}</strong> }, { title: "Solicitante", dataIndex: "applicant", key: "applicant" }, { title: "Destino", dataIndex: "purpose", key: "purpose" }, { title: "Monto", dataIndex: "amount", key: "amount", render: (value) => cop(value) }, { title: "Estado", dataIndex: "status", key: "status", render: (value) => <StatusChip status={value} /> }, { title: "Acción", key: "action", render: (_, record) => <Button type="link"><Link to={`/internal/applications/${record.id}`}>Revisar</Link></Button> }];
export default function ApplicationsPage() { return <div className="internal-page"><PageHeader eyebrow="Gestión operativa" title="Solicitudes" description="Revisa información y deja trazabilidad de cada decisión." action={<Button type="primary">Exportar reporte</Button>} /><Card className="table-card"><Table rowKey="id" columns={columns} dataSource={mockApplications} pagination={false} scroll={{ x: 900 }} /></Card></div>; }
