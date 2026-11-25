import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Empty, Row, Select, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeader } from "../../components/GeneralComponents";
import { loanService } from "../../services/loanService";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);
const categoryLabels = {
  LIGHT_DELAY: "Retraso leve",
  EARLY_ARREARS: "Mora temprana",
  ESTABLISHED_ARREARS: "Mora establecida",
};
const categoryColors = { LIGHT_DELAY: "orange", EARLY_ARREARS: "volcano", ESTABLISHED_ARREARS: "red" };
const alertTypes = {
  UPCOMING_PAYMENT: "info",
  ARREARS_LIGHT: "warning",
  ARREARS_EARLY: "warning",
  ARREARS_ESTABLISHED: "error",
};

export default function ArrearsPage() {
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [category, setCategory] = useState();
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [arrears, pendingAlerts] = await Promise.all([
        loanService.listArrears(),
        loanService.listArrearsAlerts(),
      ]);
      setItems(arrears || []);
      setAlerts(pendingAlerts || []);
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible consultar la cartera vencida.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visibleItems = useMemo(
    () => category ? items.filter((item) => item.category === category) : items,
    [items, category]
  );
  const counts = useMemo(() => ({
    light: items.filter((item) => item.category === "LIGHT_DELAY").length,
    early: items.filter((item) => item.category === "EARLY_ARREARS").length,
    established: items.filter((item) => item.category === "ESTABLISHED_ARREARS").length,
  }), [items]);

  const handleAlertRead = async (alertId) => {
    try {
      await loanService.markAlertRead(alertId);
      setAlerts((current) => current.filter((item) => item.id !== alertId));
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible atender la alerta.");
    }
  };

  const columns = [
    { title: "Préstamo", dataIndex: "loanNumber", key: "loanNumber" },
    { title: "Solicitante", key: "applicant", render: (_, row) => `${row.applicant?.firstName || ""} ${row.applicant?.lastName || ""}`.trim() || "—" },
    { title: "Cuotas vencidas", key: "installments", render: (_, row) => row.installments?.length || 0 },
    { title: "Saldo vencido", dataIndex: "totalOutstanding", key: "totalOutstanding", render: cop },
    {
      title: "Clasificación",
      dataIndex: "category",
      key: "category",
      render: (value) => <Tag color={categoryColors[value]}>{categoryLabels[value] || value}</Tag>,
    },
    { title: "Días de mora", dataIndex: "maxDaysOverdue", key: "maxDaysOverdue", render: (value) => <Tag color={categoryColors[visibleItems.find((item) => item.maxDaysOverdue === value)?.category] || "red"}>{value} días</Tag> },
  ];

  return <div className="portal-page">
    <PageHeader
      eyebrow="Seguimiento de cartera"
      title="Cartera en mora"
      description="Clasificación automática por días calendario. El primer día de mora corresponde al día siguiente del vencimiento; no se calculan intereses ni penalidades adicionales."
      action={<Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>}
    />

    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={8}><Card><Typography.Text type="secondary">Retraso leve</Typography.Text><Typography.Title level={3}>{counts.light}</Typography.Title><Typography.Text type="secondary">1 a 30 días</Typography.Text></Card></Col>
      <Col xs={24} sm={8}><Card><Typography.Text type="secondary">Mora temprana</Typography.Text><Typography.Title level={3}>{counts.early}</Typography.Title><Typography.Text type="secondary">31 a 60 días</Typography.Text></Card></Col>
      <Col xs={24} sm={8}><Card><Typography.Text type="secondary">Mora establecida</Typography.Text><Typography.Title level={3}>{counts.established}</Typography.Title><Typography.Text type="secondary">Más de 60 días</Typography.Text></Card></Col>
    </Row>

    {alerts.length > 0 && <Card title={`Alertas administrativas pendientes (${alerts.length})`} style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gap: 10 }}>
        {alerts.map((item) => <Alert
          key={item.id}
          type={alertTypes[item.type] || "info"}
          showIcon
          closable
          onClose={() => handleAlertRead(item.id)}
          message={item.title}
          description={<>
            <div>{item.message}</div>
            <Typography.Text type="secondary">
              {item.loan?.loanNumber || "Préstamo"} · Cuota {item.schedule?.installment ?? "—"} · {item.loan?.application?.applicant ? `${item.loan.application.applicant.firstName} ${item.loan.application.applicant.lastName}` : "Solicitante"}
            </Typography.Text>
          </>}
        />)}
      </div>
    </Card>}

    <Card className="detail-card">
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[12, 12]}>
        <Col><Typography.Title level={5} style={{ margin: 0 }}>Préstamos vencidos</Typography.Title></Col>
        <Col>
          <Select
            allowClear
            placeholder="Todas las categorías"
            style={{ width: 220 }}
            value={category}
            onChange={setCategory}
            options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
          />
        </Col>
      </Row>
      <Table
        rowKey="loanId"
        columns={columns}
        dataSource={visibleItems}
        loading={loading}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (row) => <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={row.installments || []}
            columns={[
              { title: "Cuota", dataIndex: "installment" },
              { title: "Vencimiento", dataIndex: "dueDate", render: (value) => dayjs(value).format("DD/MM/YYYY") },
              { title: "Saldo pendiente", dataIndex: "outstanding", render: cop },
              { title: "Días vencidos", dataIndex: "daysOverdue" },
              { title: "Clasificación", dataIndex: "category", render: (value) => <Tag color={categoryColors[value]}>{categoryLabels[value]}</Tag> },
            ]}
          />,
        }}
        locale={{ emptyText: <Empty description="No hay cuotas vencidas para esta categoría." /> }}
      />
    </Card>
  </div>;
}
