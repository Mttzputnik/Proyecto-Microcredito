import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeader } from "../../components/GeneralComponents";
import { auditService } from "../../services/auditService";

const { RangePicker } = DatePicker;
export default function AuditPage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [range, setRange] = useState(null);
  const [action, setAction] = useState();
  const [entityType, setEntityType] = useState();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await auditService.list({
        page, limit: pagination.pageSize,
        ...(range ? { from: range[0].startOf("day").toISOString(), to: range[1].endOf("day").toISOString() } : {}),
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {})
      });
      setEvents(data.items);
      setPagination((current) => ({ ...current, current: data.pagination.page, total: data.pagination.total }));
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible consultar la auditoría.");
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, range, action, entityType]);

  useEffect(() => { load(1); }, [load]);

  const columns = [
    { title: "Fecha", dataIndex: "occurredAt", key: "occurredAt", render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm") },
    { title: "Actor", dataIndex: "actorName", key: "actorName" },
    { title: "Acción", dataIndex: "action", key: "action", render: (value) => <Tag>{value}</Tag> },
    { title: "Entidad", dataIndex: "entityType", key: "entityType" },
    { title: "Identificador", dataIndex: "entityId", key: "entityId", responsive: ["lg"] },
    { title: "Descripción", dataIndex: "description", key: "description" }
  ];

  return <div className="internal-page">
    <PageHeader eyebrow="Trazabilidad operativa" title="Auditoría" description="Consulta eventos registrados por el sistema y por los usuarios internos. Esta vista detallada está reservada al área administrativa." action={<Button icon={<ReloadOutlined />} onClick={() => load(1)}>Actualizar</Button>} />
    <Card className="detail-card">
      <Space wrap style={{ marginBottom: 16 }}>
        <RangePicker value={range} onChange={setRange} allowClear />
        <Input allowClear value={action} onChange={(event) => setAction(event.target.value || undefined)} placeholder="Acción exacta" style={{ width: 180 }} />
        <Select allowClear value={entityType} onChange={setEntityType} placeholder="Tipo de entidad" style={{ width: 180 }} options={["Loan","LoanApplication","PaymentSchedule","Payment","Alert","CreditPolicy","Reconsideration"].map((value) => ({ value, label: value }))} />
        <Button type="primary" onClick={() => load(1)}>Filtrar</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={events} loading={loading} pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: false, onChange: (page) => load(page) }} />
      <Typography.Text type="secondary">Los metadatos internos y datos financieros detallados no se exponen en esta consulta.</Typography.Text>
    </Card>
  </div>;
}
