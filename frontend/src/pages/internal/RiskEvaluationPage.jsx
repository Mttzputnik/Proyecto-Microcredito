import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Form, Input, Radio, Row, Statistic, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined, FileTextOutlined, InfoCircleOutlined, SafetyCertificateOutlined, WarningOutlined, ReloadOutlined } from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import { AuditTimeline, JustificationBlock } from "../../components/DecisionComponents";
import { riskService } from "../../services/riskService";

const cop = (value) => value == null ? "No disponible" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const purposeLabels = { negocio: "Compra de mercancía para negocio", herramientas: "Herramientas de trabajo", estudio: "Estudios", hogar: "Mejora de vivienda", otro: "Otro propósito" };
const outcomeLabels = {
  APPROVED: "Aprobar solicitud",
  APPROVED_WITH_CONDITIONS: "Aprobar con condiciones",
  REJECTED: "Rechazar solicitud"
};
const checkStatus = {
  PASS: { label: "Cumple", color: "success" },
  FAIL: { label: "No cumple", color: "error" },
  NOT_EVALUABLE: { label: "Pendiente de verificar", color: "warning" }
};
const formatDate = (value) => value ? new Date(value).toLocaleString("es-CO") : "Fecha no disponible";

export default function RiskEvaluationPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [decisionForm] = Form.useForm();
  const [verificationForm] = Form.useForm();

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await riskService.getApplicationForReview(id);
      setApplication(result);
      setEvaluation(result.evaluations?.[0] ?? null);
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible cargar el expediente.");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runEvaluation = async () => {
    setEvaluating(true); setError("");
    try {
      const result = await riskService.runEvaluation(id);
      setEvaluation(result);
      message.success("Evaluación registrada y asociada a la política vigente.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible ejecutar la evaluación.");
    } finally { setEvaluating(false); }
  };

  const verifyResidence = async (values) => {
    setVerifying(true); setError("");
    try {
      await riskService.verifyResidence(id, values);
      message.success("Verificación de residencia registrada.");
      verificationForm.resetFields();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible registrar la verificación.");
    } finally { setVerifying(false); }
  };

  const saveDecision = async (values) => {
    setSaving(true); setError("");
    try {
      await riskService.saveDecision({
        applicationId: id, outcome: values.outcome,
        justification: values.justification, conditions: values.conditions
      });
      message.success("Decisión y justificación registradas en el expediente.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible guardar la decisión.");
    } finally { setSaving(false); }
  };

  if (!application) return <div className="internal-page">{error ? <Alert type="error" showIcon message={error} /> : <Card loading />}</div>;
  const applicant = application.applicant;
  const policy = evaluation?.policy;
  const checks = evaluation?.indicators?.checks ?? [];
  const historyItems = (application.auditHistory ?? []).map((item) => ({
    action: item.description || item.action,
    actor: item.actorId || "Sistema",
    date: formatDate(item.occurredAt)
  }));
  const residence = application.verification;

  return <div className="internal-page risk-page">
    <PageHeader eyebrow="Oficial de crédito · Evaluación" title={`Revisión ${application.applicationNumber}`}
      description="Revisa la evidencia, ejecuta los criterios de la política y registra una decisión humana justificada."
      action={<Button icon={<ArrowLeftOutlined />}><Link to="/internal/applications">Volver a solicitudes</Link></Button>} />
    {error && <Alert type="error" showIcon message={error} className="risk-alert" />}
    <Row gutter={[18, 18]}>
      <Col xs={24} xl={15}>
        <Card className="detail-card risk-section">
          <div className="card-heading"><div><span className="eyebrow">Información del solicitante</span><h2>{applicant.firstName} {applicant.lastName}</h2></div><Tag color="blue">{application.status}</Tag></div>
          <Descriptions column={{ xs: 1, sm: 2 }} items={[
            { key: "document", label: "Documento", children: `${applicant.documentType} ${applicant.documentNumber}` },
            { key: "location", label: "Residencia declarada", children: `${applicant.address || "Dirección no registrada"} · ${applicant.municipality || "Sin municipio"} · Zona ${applicant.residenceZone || "no indicada"}` },
            { key: "activity", label: "Actividad", children: `${applicant.occupation || "No indicada"} · ${applicant.activityDuration || "Antigüedad no indicada"}` },
            { key: "dependents", label: "Personas a cargo", children: applicant.dependents },
            { key: "income", label: "Ingresos mensuales", children: cop(applicant.monthlyIncome) },
            { key: "expenses", label: "Gastos mensuales", children: cop(applicant.monthlyExpenses) },
            { key: "debt", label: "Obligaciones mensuales declaradas", children: cop(applicant.monthlyDebtPayments) },
            { key: "amount", label: "Monto solicitado", children: cop(application.requestedAmount) },
            { key: "term", label: "Plazo solicitado", children: `${application.requestedTerm} meses` },
            { key: "purpose", label: "Destino", children: purposeLabels[application.purpose] || application.purpose }
          ]} />
        </Card>

        <Card className="detail-card risk-section">
          <div className="card-heading"><div><span className="eyebrow">Verificación de residencia</span><h2>Validación por el oficial</h2></div>
            <Tag color={residence?.verified ? "success" : residence ? "error" : "warning"}>{residence ? (residence.verified ? "Verificada" : "No verificada") : "Pendiente"}</Tag>
          </div>
          {residence && <Typography.Paragraph>{residence.notes} · {formatDate(residence.verifiedAt)}</Typography.Paragraph>}
          <Form form={verificationForm} layout="vertical" onFinish={verifyResidence}>
            <Form.Item name="verified" label="Resultado de la verificación" rules={[{ required: true, message: "Selecciona el resultado" }]}>
              <Radio.Group options={[{ label: "Residencia confirmada", value: true }, { label: "No fue posible confirmarla", value: false }]} />
            </Form.Item>
            <Form.Item name="notes" label="Evidencia y observaciones" rules={[{ required: true, min: 10, message: "Describe la verificación (mínimo 10 caracteres)" }]}>
              <Input.TextArea rows={2} maxLength={1000} showCount placeholder="Describe cómo se verificó la residencia y el resultado obtenido." />
            </Form.Item>
            <Button htmlType="submit" loading={verifying}>Guardar verificación</Button>
          </Form>
        </Card>

        <Card className="detail-card risk-section">
          <div className="card-heading"><div><span className="eyebrow">Indicadores de elegibilidad</span><h2>Resultado de la evaluación</h2></div>
            <Tag icon={<InfoCircleOutlined />} color="gold">Apoyo a decisión humana</Tag>
          </div>
          <Button type="primary" icon={<ReloadOutlined />} loading={evaluating} onClick={runEvaluation}>Ejecutar evaluación con política vigente</Button>
          {!evaluation ? <Alert className="risk-alert" type="info" showIcon message="Aún no hay una evaluación registrada." description="Ejecuta la evaluación para aplicar los criterios configurados y guardar su resultado en el historial." />
            : <>
              <Alert className="risk-alert" type={evaluation.result === "SUPPORTS_APPROVAL" ? "success" : evaluation.result === "SUPPORTS_REJECTION" ? "error" : "warning"}
                showIcon message={`Recomendación: ${evaluation.result}`} description={evaluation.observations || "Los criterios evaluables se cumplen. La decisión final corresponde al oficial."} />
              <Row gutter={[14, 14]}>{checks.map((item) => {
                const status = checkStatus[item.status] || checkStatus.NOT_EVALUABLE;
                return <Col xs={24} sm={12} key={item.code}>
                  <div className={`risk-indicator ${item.status === "PASS" ? "positive" : item.status === "FAIL" ? "negative" : "review"}`}>
                    <div className="risk-indicator-icon">{item.status === "PASS" ? <CheckCircleOutlined /> : <WarningOutlined />}</div>
                    <span>{item.label}</span><Tag color={status.color}>{status.label}</Tag><small>{item.detail}</small>
                  </div>
                </Col>;
              })}</Row>
              <div className="calculation-strip">
                <Statistic title="Cuota estimada" value={cop(evaluation.estimatedInstallment)} />
                <Statistic title="Relación deuda / ingreso" value={evaluation.debtToIncomeRatio == null ? "N/D" : `${(evaluation.debtToIncomeRatio * 100).toFixed(1)} %`} />
                <Statistic title="Préstamos internos vigentes" value={evaluation.indicators?.internalHistory?.activeLoans ?? "N/D"} />
              </div>
              {policy && <><div className="card-heading"><div><span className="eyebrow">Política aplicada</span><h3>{policy.name}</h3></div><Tag color="green">Versión {policy.version}</Tag></div>
                <Typography.Paragraph className="policy-note"><SafetyCertificateOutlined /> La evaluación conserva la versión de política utilizada.</Typography.Paragraph></>}
              <JustificationBlock title="Observaciones del análisis">{evaluation.observations || "Sin observaciones adicionales."}</JustificationBlock>
            </>}
        </Card>
      </Col>
      <Col xs={24} xl={9}>
        <Card className="detail-card decision-card">
          <div className="card-heading"><div><span className="eyebrow">Registro obligatorio</span><h2>Decisión humana</h2></div><FileTextOutlined className="decision-icon" /></div>
          <p className="decision-intro">Selecciona el resultado y explica los motivos. Una recomendación del sistema no sustituye tu criterio profesional.</p>
          <Form form={decisionForm} layout="vertical" onFinish={saveDecision} requiredMark="optional" disabled={application.status !== "UNDER_REVIEW"}>
            <Form.Item name="outcome" label="Resultado" rules={[{ required: true, message: "Selecciona un resultado" }]}>
              <Radio.Group className="outcome-options">{Object.entries(outcomeLabels).map(([value, label]) => <Radio value={value} key={value}>{label}</Radio>)}</Radio.Group>
            </Form.Item>
            <Form.Item name="justification" label="Justificación" rules={[{ required: true, min: 10, message: "La justificación debe tener al menos 10 caracteres" }]}>
              <Input.TextArea rows={5} showCount maxLength={2000} placeholder="Explica los indicadores revisados, la política aplicada y las circunstancias relevantes." />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, current) => prev.outcome !== current.outcome}>
              {({ getFieldValue }) => getFieldValue("outcome") === "APPROVED_WITH_CONDITIONS" ?
                <Form.Item name="conditions" label="Condiciones de aprobación" rules={[{ required: true, min: 10, message: "Describe las condiciones" }]}>
                  <Input.TextArea rows={3} maxLength={2000} placeholder="Registra las condiciones que deben cumplirse antes de formalizar." />
                </Form.Item> : null}
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={saving} disabled={application.status !== "UNDER_REVIEW"} icon={<CheckCircleOutlined />}>Registrar decisión y justificación</Button>
          </Form>
        </Card>
        <Card className="detail-card"><div className="card-heading"><h2>Trazabilidad</h2><Tag color="blue">Auditable</Tag></div>
          <AuditTimeline items={historyItems} />
        </Card>
      </Col>
    </Row>
  </div>;
}
