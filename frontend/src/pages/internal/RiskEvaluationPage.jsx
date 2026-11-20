import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Form, Input, Radio, Row, Statistic, Tag, Typography } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, FileTextOutlined, InfoCircleOutlined, SafetyCertificateOutlined, WarningOutlined } from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import { AuditTimeline, JustificationBlock } from "../../components/DecisionComponents";
import { riskService } from "../../services/riskService";
import { mockAuditItems, riskIndicators } from "../../mocks/riskData";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const purposeLabels = { negocio: "Compra de mercancía para negocio", herramientas: "Herramientas de trabajo", estudio: "Estudios", hogar: "Mejora de vivienda", otro: "Otro propósito" };
const outcomeLabels = { APPROVED: "Aprobar solicitud", APPROVED_WITH_CONDITIONS: "Aprobar con condiciones", REJECTED: "Rechazar solicitud" };

export default function RiskEvaluationPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();

  useEffect(() => { riskService.getApplicationForReview(id).then(setApplication); }, [id]);

  const saveDecision = async (values) => {
    setSaving(true); setError("");
    try { await riskService.saveDecision({ applicationId: application.id, outcome: values.outcome, justification: values.justification, conditions: values.conditions || null }); setSaved(true); }
    catch { setError("No fue posible guardar la decisión. Intenta nuevamente."); }
    finally { setSaving(false); }
  };

  if (!application) return <div className="internal-page"><Card loading />;</div>;
  const applicant = application.applicant;
  const evaluation = application.evaluation;

  return <div className="internal-page risk-page">
    <PageHeader eyebrow="Oficial de crédito · Evaluación" title={`Revisión ${application.applicationNumber}`} description="Evalúa los indicadores como apoyo a tu criterio profesional y deja una justificación comprensible y trazable." action={<Button icon={<ArrowLeftOutlined />}><Link to="/internal/applications">Volver a solicitudes</Link></Button>} />
    {saved && <Alert type="success" showIcon message="La decisión fue registrada en modo demostración." description="Cuando exista el endpoint real, esta acción creará un LoanDecision y su evento de auditoría." closable onClose={() => setSaved(false)} />}
    {error && <Alert type="error" showIcon message={error} className="risk-alert" />}
    <Row gutter={[18, 18]}>
      <Col xs={24} xl={15}>
        <Card className="detail-card risk-section"><div className="card-heading"><div><span className="eyebrow">Información del solicitante</span><h2>{applicant.firstName} {applicant.lastName}</h2></div><Tag color="blue">En revisión</Tag></div><Descriptions column={{ xs: 1, sm: 2 }} items={[{ key: "document", label: "Documento", children: `${applicant.documentType} ${applicant.documentNumber}` }, { key: "location", label: "Residencia", children: `${applicant.municipality} · Zona ${applicant.residenceZone}` }, { key: "activity", label: "Actividad", children: `${applicant.occupation} · ${applicant.activityDuration} años` }, { key: "dependents", label: "Personas a cargo", children: applicant.dependents }, { key: "amount", label: "Monto solicitado", children: cop(application.requestedAmount) }, { key: "term", label: "Plazo solicitado", children: `${application.requestedTerm} meses` }, { key: "purpose", label: "Destino", children: purposeLabels[application.purpose] }]} /></Card>
        <Card className="detail-card risk-section"><div className="card-heading"><div><span className="eyebrow">Indicadores de apoyo</span><h2>Lectura financiera</h2></div><Tag icon={<InfoCircleOutlined />} color="gold">No es una decisión automática</Tag></div><Row gutter={[14, 14]}>{riskIndicators.map((item) => <Col xs={24} sm={12} key={item.key}><div className={`risk-indicator ${item.tone}`}><div className="risk-indicator-icon">{item.tone === "positive" ? <CheckCircleOutlined /> : <WarningOutlined />}</div><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div></Col>)}</Row><div className="calculation-strip"><Statistic title="Cuota estimada de apoyo" value={cop(evaluation.estimatedInstallment)} /><Statistic title="Obligaciones actuales" value={cop(evaluation.existingObligations)} /><Statistic title="Resultado orientativo" value="Revisión humana" /></div><JustificationBlock title="Observación del análisis preliminar">{evaluation.observations}</JustificationBlock></Card>
        <Card className="detail-card risk-section"><div className="card-heading"><div><span className="eyebrow">Política aplicada</span><h2>{application.policy.name}</h2></div><Tag color="green">Versión {application.policy.version}</Tag></div><Descriptions size="small" column={{ xs: 1, sm: 3 }} items={[{ key: "age", label: "Edad mínima", children: "18 años" }, { key: "maxAmount", label: "Monto máximo", children: cop(application.policy.maximumAmount) }, { key: "maxTerm", label: "Plazo máximo", children: `${application.policy.maximumTermMonths} meses` }]} /><Typography.Paragraph className="policy-note"><SafetyCertificateOutlined /> La evaluación debe conservar la política utilizada y sus indicadores.</Typography.Paragraph></Card>
      </Col>
      <Col xs={24} xl={9}><Card className="detail-card decision-card"><div className="card-heading"><div><span className="eyebrow">Registro obligatorio</span><h2>Decisión humana</h2></div><FileTextOutlined className="decision-icon" /></div><p className="decision-intro">Selecciona un resultado y explica las razones. La justificación será parte permanente del historial.</p><Form form={form} layout="vertical" onFinish={saveDecision} requiredMark="optional"><Form.Item name="outcome" label="Resultado de la solicitud" rules={[{ required: true, message: "Selecciona un resultado" }]}><Radio.Group className="outcome-options">{Object.entries(outcomeLabels).map(([value, label]) => <Radio value={value} key={value}>{label}</Radio>)}</Radio.Group></Form.Item><Form.Item name="justification" label="Justificación de la decisión" rules={[{ required: true, message: "La justificación es obligatoria" }, { min: 30, message: "Escribe al menos 30 caracteres para explicar la decisión" }]} extra="Describe los indicadores revisados, la política aplicada y las circunstancias relevantes."><Input.TextArea rows={6} showCount maxLength={1000} placeholder="Ej. Se revisaron los ingresos, gastos y obligaciones declaradas..." /></Form.Item><Form.Item noStyle shouldUpdate={(prev, current) => prev.outcome !== current.outcome}>{({ getFieldValue }) => getFieldValue("outcome") === "APPROVED_WITH_CONDITIONS" ? <Form.Item name="conditions" label="Condiciones de aprobación" rules={[{ required: true, message: "Describe las condiciones" }]}><Input.TextArea rows={3} placeholder="Ej. Presentar soporte de ingresos antes de formalizar..." /></Form.Item> : null}</Form.Item><Button type="primary" htmlType="submit" size="large" block loading={saving} icon={<CheckCircleOutlined />}>Registrar decisión y justificación</Button></Form></Card><Card className="detail-card"><div className="card-heading"><h2>Trazabilidad</h2><Tag color="blue">Auditable</Tag></div><AuditTimeline items={mockAuditItems} /></Card></Col>
    </Row>
  </div>;
}
