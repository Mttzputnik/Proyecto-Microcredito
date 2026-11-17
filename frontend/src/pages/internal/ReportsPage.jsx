import {
  BarChartOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  RiseOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Progress, Row, Statistic, Table, Tag } from "antd";
import { PageHeader } from "../../components/GeneralComponents";
import {
  equityByMunicipality,
  equityReport,
  portfolioByPurpose,
  portfolioReport,
} from "../../mocks/reportData";

const cop = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
const municipalityColumns = [
  { title: "Municipio", dataIndex: "municipality", key: "municipality" },
  { title: "Solicitudes", dataIndex: "applications", key: "applications" },
  { title: "Aprobadas", dataIndex: "approved", key: "approved" },
  {
    title: "Tasa de aprobación",
    dataIndex: "approvalRate",
    key: "approvalRate",
    render: (value) => `${value}%`,
  },
];
export default function ReportsPage() {
  return (
    <div className="internal-page reports-page">
      <PageHeader
        eyebrow="Administración y comité supervisor"
        title="Reportes de portafolio y equidad"
        description={`Corte de información: ${portfolioReport.asOf}. Indicadores agregados para orientar decisiones, no para sustituir el análisis humano.`}
        action={
          <Button type="primary" icon={<DownloadOutlined />}>
            Descargar reporte
          </Button>
        }
      />
      <div className="report-filters">
        <Tag color="blue">Portafolio vigente</Tag>
        <Tag color="green">Equidad de acceso</Tag>
        <span>Última actualización: {portfolioReport.asOf}</span>
      </div>
      <Row gutter={[18, 18]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card">
            <RiseOutlined className="metric-icon" />
            <Statistic
              title="Portafolio vigente"
              value={cop(portfolioReport.totalPortfolio)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card">
            <TeamOutlined className="metric-icon" />
            <Statistic
              title="Créditos activos"
              value={portfolioReport.activeLoans}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card">
            <BarChartOutlined className="metric-icon" />
            <Statistic
              title="Tasa de aprobación"
              value={portfolioReport.approvalRate}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card">
            <Statistic
              title="Mora de portafolio"
              value={portfolioReport.delinquencyRate}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[18, 18]}>
        <Col xs={24} lg={12}>
          <Card className="detail-card report-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Distribución</span>
                <h2>Destino del crédito</h2>
              </div>
              <Tag>Porcentaje del portafolio</Tag>
            </div>
            {portfolioByPurpose.map((item) => (
              <div className="report-bar" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}%</strong>
                </div>
                <Progress
                  percent={item.value}
                  showInfo={false}
                  strokeColor="#1F7A5A"
                />
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="detail-card report-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Acceso</span>
                <h2>Indicadores de equidad</h2>
              </div>
              <Tag color="green">Agregado</Tag>
            </div>
            <div className="equity-metric">
              <span>Participación de mujeres</span>
              <strong>{equityReport.womenShare}%</strong>
              <Progress
                percent={equityReport.womenShare}
                strokeColor="#1E3A5F"
              />
            </div>
            <div className="equity-metric">
              <span>Municipios rurales</span>
              <strong>{equityReport.ruralShare}%</strong>
              <Progress
                percent={equityReport.ruralShare}
                strokeColor="#1F7A5A"
              />
            </div>
            <div className="equity-metric">
              <span>Personas jóvenes</span>
              <strong>{equityReport.youngAdultsShare}%</strong>
              <Progress
                percent={equityReport.youngAdultsShare}
                strokeColor="#F2A93B"
              />
            </div>
            <p className="report-note">
              <InfoCircleOutlined /> {equityReport.note}
            </p>
          </Card>
        </Col>
      </Row>
      <Card className="detail-card report-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Cobertura territorial</span>
            <h2>Solicitudes por municipio</h2>
          </div>
          <span className="muted-text">No se muestran datos personales</span>
        </div>
        <Table
          rowKey="municipality"
          columns={municipalityColumns}
          dataSource={equityByMunicipality}
          pagination={false}
        />
      </Card>
    </div>
  );
}

