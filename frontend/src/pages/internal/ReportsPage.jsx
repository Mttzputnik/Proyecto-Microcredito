import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChartOutlined, DownloadOutlined, ReloadOutlined, RiseOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, DatePicker, Empty, Progress, Row, Statistic, Table, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { PageHeader } from "../../components/GeneralComponents";
import { reportService } from "../../services/reportService";

const { RangePicker } = DatePicker;
const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);
const categoryLabels = { LIGHT_DELAY: "Retraso leve", EARLY_ARREARS: "Mora temprana", ESTABLISHED_ARREARS: "Mora establecida" };
const outcomeLabels = { APPROVED: "Aprobadas", APPROVED_WITH_CONDITIONS: "Aprobadas con condiciones", REJECTED: "Rechazadas" };
const statusLabels = {
  PENDING_ASSIGNMENT: "Pendientes de asignación", UNDER_REVIEW: "En revisión",
  PENDING_DOCUMENTS: "Pendientes de documentos", APPROVED: "Aprobadas",
  APPROVED_WITH_CONDITIONS: "Aprobadas con condiciones", REJECTED: "Rechazadas",
  CANCELLED: "Canceladas"
};
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(() => range ? {
    from: range[0].startOf("day").toISOString(),
    to: range[1].endOf("day").toISOString()
  } : {}, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await reportService.getSummary(filters));
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible cargar los reportes.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const downloadCsv = () => {
    if (!report) return;
    const rows = [
      ["Sección", "Indicador", "Valor"],
      ["Cartera", "Saldo vigente", report.portfolio.outstanding],
      ["Cartera", "Préstamos activos", report.portfolio.activeLoans],
      ["Cartera", "Pagos recibidos en el periodo", report.portfolio.paymentsCollected],
      ["Cartera", "Mora de cartera (%)", report.portfolio.delinquencyRate],
      ["Solicitudes", "Total", report.applications.total],
      ["Solicitudes", "Tasa de aprobación (%)", report.applications.approvalRate],
      ...report.applications.byStatus.map((item) => ["Solicitudes por estado", statusLabels[item.status] || item.status, item.count]),
      ...report.arrears.map((item) => ["Mora", categoryLabels[item.category] || item.category, item.installments]),
      ...report.supervision.byMunicipality.map((item) => ["Municipio", item.municipality, item.applications]),
      ...report.supervision.byPurpose.map((item) => ["Propósito", item.purpose, item.applications]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reporte-microcredito-${dayjs().format("YYYY-MM-DD")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const municipalityColumns = [
    { title: "Municipio", dataIndex: "municipality", key: "municipality" },
    { title: "Solicitudes", dataIndex: "applications", key: "applications" },
    { title: "Aprobadas", dataIndex: "approved", key: "approved" },
    { title: "Rechazadas", dataIndex: "rejected", key: "rejected" },
    { title: "Tasa de aprobación", dataIndex: "approvalRate", key: "approvalRate", render: (value) => `${value}%` },
    { title: "Días promedio de decisión", dataIndex: "averageDecisionDays", key: "averageDecisionDays", render: (value) => value === null ? "—" : value },
  ];
  const purposeColumns = [
    { title: "Destino", dataIndex: "purpose", key: "purpose" },
    { title: "Solicitudes", dataIndex: "applications", key: "applications" },
    { title: "Aprobadas", dataIndex: "approved", key: "approved" },
    { title: "Tasa de aprobación", dataIndex: "approvalRate", key: "approvalRate", render: (value) => `${value}%` },
    { title: "Monto solicitado promedio", dataIndex: "averageRequestedAmount", key: "averageRequestedAmount", render: cop },
  ];
  const performanceColumns = [
    { title: "Destino", dataIndex: "purpose", key: "purpose" },
    { title: "Préstamos activos", dataIndex: "activeLoans", key: "activeLoans" },
    { title: "Saldo vigente", dataIndex: "outstanding", key: "outstanding", render: cop },
    { title: "Saldo vencido", dataIndex: "overdueOutstanding", key: "overdueOutstanding", render: cop },
    { title: "Mora (%)", dataIndex: "delinquencyRate", key: "delinquencyRate", render: (value) => `${value}%` },
  ];

  return <div className="internal-page reports-page">
    <PageHeader
      eyebrow="Administración y comité supervisor"
      title="Reportes de cartera y supervisión"
      description={report ? `Información agregada. Corte: ${dayjs(report.asOf).format("DD/MM/YYYY HH:mm")}.` : "Indicadores agregados de cartera, solicitudes y comportamiento de pago."}
      action={<Button type="primary" icon={<DownloadOutlined />} onClick={downloadCsv} disabled={!report}>Descargar CSV</Button>}
    />
    <Card className="detail-card" style={{ marginBottom: 18 }}>
      <Row align="middle" gutter={[12, 12]}>
        <Col><Typography.Text strong>Periodo de solicitudes y pagos</Typography.Text></Col>
        <Col><RangePicker value={range} onChange={setRange} allowClear /></Col>
        <Col><Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualizar</Button></Col>
      </Row>
      <Typography.Text type="secondary">Si no seleccionas fechas, se consulta el último año. Los indicadores de cartera vigente corresponden al estado actual.</Typography.Text>
    </Card>

    {report && <>
      <Row gutter={[18, 18]} style={{ marginBottom: 18 }}>
        <Col xs={24} sm={12} lg={6}><Card className="metric-card"><RiseOutlined className="metric-icon" /><Statistic title="Saldo de cartera activa" value={cop(report.portfolio.outstanding)} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card className="metric-card"><TeamOutlined className="metric-icon" /><Statistic title="Préstamos activos" value={report.portfolio.activeLoans} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card className="metric-card"><BarChartOutlined className="metric-icon" /><Statistic title="Tasa de aprobación" value={report.applications.approvalRate} suffix="%" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card className="metric-card"><Statistic title="Mora de cartera" value={report.portfolio.delinquencyRate} suffix="%" /></Card></Col>
      </Row>

      <Row gutter={[18, 18]} style={{ marginBottom: 18 }}>
        <Col xs={24} lg={12}><Card className="detail-card">
          <Typography.Title level={5}>Resumen de solicitudes</Typography.Title>
          <Row gutter={[12, 12]}>
            <Col span={8}><Statistic title="Recibidas" value={report.applications.total} /></Col>
            <Col span={8}><Statistic title="Pendientes" value={report.applications.pending} /></Col>
            <Col span={8}><Statistic title="Decididas" value={report.applications.decided} /></Col>
          </Row>
          <Table size="small" rowKey="status" pagination={false} dataSource={report.applications.byStatus} columns={[
            { title: "Estado", dataIndex: "status", render: (value) => statusLabels[value] || value },
            { title: "Cantidad", dataIndex: "count" }
          ]} />
        </Card></Col>
        <Col xs={24} lg={12}><Card className="detail-card">
          <Typography.Title level={5}>Comportamiento de cartera vencida</Typography.Title>
          <Row gutter={[12, 12]}>
            <Col span={12}><Statistic title="Pagos recibidos en el periodo" value={cop(report.portfolio.paymentsCollected)} /></Col>
            <Col span={12}><Statistic title="Saldo vencido" value={cop(report.portfolio.overdueOutstanding)} /></Col>
          </Row>
          <Table size="small" rowKey="category" pagination={false} dataSource={report.arrears} columns={[
            { title: "Categoría", dataIndex: "category", render: (value) => categoryLabels[value] || value },
            { title: "Cuotas", dataIndex: "installments" },
            { title: "Préstamos", dataIndex: "loans" },
            { title: "Saldo", dataIndex: "outstanding", render: cop }
          ]} />
        </Card></Col>
      </Row>

      <Card className="detail-card" style={{ marginBottom: 18 }}>
        <Typography.Title level={5}>Supervisión por municipio</Typography.Title>
        <Alert type="info" showIcon message="Protección de grupos pequeños" description={`Solo se muestran grupos con al menos ${report.supervision.minimumGroupSize} solicitudes. No se exponen datos personales ni dimensiones demográficas que no estén definidas en el modelo de datos.`} style={{ marginBottom: 14 }} />
        <Table rowKey="municipality" dataSource={report.supervision.byMunicipality} columns={municipalityColumns} loading={loading} pagination={{ pageSize: 8 }} locale={{ emptyText: <Empty description="No hay grupos con volumen suficiente para mostrar." /> }} />
      </Card>

      <Row gutter={[18, 18]} style={{ marginBottom: 18 }}>
        <Col xs={24} lg={12}><Card className="detail-card">
          <Typography.Title level={5}>Supervisión por destino del crédito</Typography.Title>
          <Table size="small" rowKey="purpose" dataSource={report.supervision.byPurpose} columns={purposeColumns} pagination={false} locale={{ emptyText: "Sin grupos con volumen suficiente." }} />
        </Card></Col>
        <Col xs={24} lg={12}><Card className="detail-card">
          <Typography.Title level={5}>Comportamiento de pago por destino</Typography.Title>
          <Table size="small" rowKey="purpose" dataSource={report.supervision.portfolioByPurpose} columns={performanceColumns} pagination={false} locale={{ emptyText: "No hay préstamos activos para analizar." }} />
        </Card></Col>
      </Row>

      <Card className="detail-card">
        <Typography.Title level={5}>Trazabilidad de decisiones</Typography.Title>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={8}><Statistic title="Decisiones justificadas" value={report.supervision.justifiedDecisions} /></Col>
          <Col xs={12} md={8}><Statistic title="Aprobaciones condicionadas justificadas" value={report.supervision.conditionalApprovals} /></Col>
          <Col xs={12} md={8}><Statistic title="Días promedio hasta decisión" value={report.supervision.averageDecisionDays ?? "—"} /></Col>
        </Row>
        <Typography.Text type="secondary">Los resultados son descriptivos y no demuestran causalidad ni sustituyen la revisión humana del comité.</Typography.Text>
      </Card>
    </>}

    {!report && !loading && <Card><Empty description="No hay información disponible para el periodo seleccionado." /></Card>}
  </div>;
}
