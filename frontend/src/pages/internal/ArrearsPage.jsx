import { useEffect, useState } from "react";
import { Button, Card, Empty, Table, Tag, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeader } from "../../components/GeneralComponents";
import { loanService } from "../../services/loanService";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);
export default function ArrearsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setItems(await loanService.listArrears() || []); }
    catch (error) { message.error(error.response?.data?.message || "No fue posible consultar la cartera vencida."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const columns = [
    { title: "Préstamo", dataIndex: "loanNumber", key: "loanNumber" },
    { title: "Solicitante", key: "applicant", render: (_, row) => `${row.applicant?.firstName || ""} ${row.applicant?.lastName || ""}`.trim() || "—" },
    { title: "Cuotas vencidas", key: "installments", render: (_, row) => row.installments?.length || 0 },
    { title: "Saldo vencido", dataIndex: "totalOutstanding", key: "totalOutstanding", render: cop },
    { title: "Días de mora", dataIndex: "maxDaysOverdue", key: "maxDaysOverdue", render: (v) => <Tag color="red">{v} días</Tag> },
  ];
  return <div className="portal-page">
    <PageHeader eyebrow="Seguimiento de cartera" title="Cartera en mora" description="Consulta cuotas vencidas con saldo pendiente. La mora se calcula por fecha de vencimiento; no se aplican intereses ni penalidades adicionales." action={<Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>} />
    <Card className="detail-card">
      <Table rowKey="loanId" columns={columns} dataSource={items} loading={loading} pagination={{ pageSize: 10 }} expandable={{ expandedRowRender: (row) => <Table size="small" rowKey="id" pagination={false} dataSource={row.installments || []} columns={[
        { title: "Cuota", dataIndex: "installment" },
        { title: "Vencimiento", dataIndex: "dueDate", render: (v) => dayjs(v).format("DD/MM/YYYY") },
        { title: "Saldo pendiente", dataIndex: "outstanding", render: cop },
        { title: "Días vencidos", dataIndex: "daysOverdue" },
      ]} /> }} locale={{ emptyText: <Empty description="No hay cuotas vencidas registradas." /> }} />
    </Card>
  </div>;
}
