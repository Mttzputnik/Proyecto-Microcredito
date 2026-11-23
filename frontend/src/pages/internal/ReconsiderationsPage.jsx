import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Form, Input, Radio, Space, Tag, Typography, message } from "antd";
import { ReloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/GeneralComponents";
import { reconsiderationService } from "../../services/reconsiderationService";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);
const date = (value) => value ? new Date(value).toLocaleString("es-CO") : "No disponible";

function ReviewCard({ item, onResolved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const application = item.application || {};
  const originalDecision = application.decisions?.[0];
  const applicant = application.applicantSnapshot || {};
  const submit = async (values) => {
    setSaving(true);
    try {
      await reconsiderationService.decide(item.id, values);
      message.success("Resultado de reconsideración registrado.");
      await onResolved();
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible registrar el resultado.");
    } finally { setSaving(false); }
  };
  return (
    <Card className="detail-card">
      <div className="card-heading">
        <div><span className="eyebrow">{application.applicationNumber}</span><Typography.Title level={4}>{applicant.firstName} {applicant.lastName}</Typography.Title></div>
        <Tag color="processing">Pendiente de revisión</Tag>
      </div>
      <Typography.Paragraph><strong>Monto:</strong> {cop(application.requestedAmount)} · <strong>Plazo:</strong> {application.requestedTerm} meses</Typography.Paragraph>
      <Typography.Paragraph strong>Información nueva del solicitante</Typography.Paragraph>
      <Typography.Paragraph>{item.applicantMessage}</Typography.Paragraph>
      <div className="decision-history-item">
        <Typography.Text strong>Decisión original</Typography.Text>
        <Typography.Paragraph type="secondary">Responsable: {originalDecision?.officer ? `${originalDecision.officer.firstName} ${originalDecision.officer.lastName}` : "No disponible"} · {date(originalDecision?.decidedAt)}</Typography.Paragraph>
        <Typography.Paragraph>{originalDecision?.justification || "Justificación original no disponible."}</Typography.Paragraph>
      </div>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="outcome" label="Resultado de la reconsideración" rules={[{ required: true, message: "Selecciona el resultado." }]}>
          <Radio.Group options={[{ label: "Aceptar reconsideración", value: "APPROVED" }, { label: "Mantener el rechazo", value: "REJECTED" }]} />
        </Form.Item>
        <Form.Item name="justification" label="Justificación del resultado" rules={[{ required: true, message: "Registra la justificación." }, { min: 10, message: "Escribe al menos 10 caracteres." }, { max: 2000, message: "No superes los 2000 caracteres." }]}>
          <Input.TextArea rows={3} maxLength={2000} showCount />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />}>Registrar resultado</Button>
      </Form>
    </Card>
  );
}

export default function ReconsiderationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await reconsiderationService.listAssigned()); }
    catch (requestError) { setError(requestError.response?.data?.message || "No fue posible cargar las reconsideraciones asignadas."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="internal-page">
      <PageHeader eyebrow="Oficial de crédito · Revisión independiente" title="Reconsideraciones asignadas" description="Revisa la información complementaria y registra un resultado justificado. La decisión original se conserva." action={<Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Actualizar</Button>} />
      {error && <Alert type="error" showIcon message={error} />}
      {loading ? <Card loading /> : items.length ? <Space direction="vertical" size="large" style={{ width: "100%" }}>{items.map((item) => <ReviewCard key={item.id} item={item} onResolved={load} />)}</Space> : <Card className="detail-card"><Empty description="No tienes reconsideraciones pendientes." /></Card>}
    </div>
  );
}
