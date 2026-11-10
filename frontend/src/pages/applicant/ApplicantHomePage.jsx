import { ArrowRightOutlined, CheckCircleFilled, ClockCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import { Button, Card, Col, Progress, Row, Statistic } from "antd";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { PageHeader } from "../../components/GeneralComponents";
import StatusChip from "../../components/StatusChip";
import { mockApplications, mockLoan } from "../../mocks/data";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

export default function ApplicantHomePage() {
  const name = useSelector((state) => state.auth.user?.name?.split(" ")[0] || "");
  return <div className="portal-page"><PageHeader eyebrow="Mi portal" title={`Hola, ${name}`} description="Aquí puedes consultar tu solicitud y saber qué sigue." action={<Button type="primary" size="large" icon={<FileTextOutlined />}><Link to="/applicant/application">Ver mi solicitud</Link></Button>} /><div className="welcome-banner"><div><strong>Tu solicitud está avanzando</strong><p>Ya recibimos tu información. Un funcionario revisará los datos y te contactará si necesita algo más.</p></div><CheckCircleFilled /></div><Row gutter={[18, 18]}><Col xs={24} md={12}><Card className="metric-card"><Statistic title="Monto solicitado" value={mockApplications[0].amount} formatter={(value) => cop(value)} /><Link to="/applicant/application">Consultar solicitud <ArrowRightOutlined /></Link></Card></Col><Col xs={24} md={12}><Card className="metric-card"><Statistic title="Saldo de mi préstamo" value={mockLoan.balance} formatter={(value) => cop(value)} /><Link to="/applicant/loan">Ver mi préstamo <ArrowRightOutlined /></Link></Card></Col></Row><Card className="application-progress-card"><div className="card-heading"><div><span className="eyebrow">Solicitud {mockApplications[0].id}</span><h2>Estado de tu solicitud</h2></div><StatusChip status={mockApplications[0].status} /></div><Progress percent={mockApplications[0].progress} strokeColor="#1F7A5A" trailColor="#E8F5EE" /><div className="progress-labels"><span>Información recibida</span><span>En revisión</span><span>Decisión</span></div><div className="next-step"><ClockCircleOutlined /><span><strong>Próximo paso:</strong> revisión de la información financiera.</span></div></Card></div>;
}
