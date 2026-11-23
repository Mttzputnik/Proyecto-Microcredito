import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Form, Input, InputNumber, Row, Select, Space, Spin, Switch, Table, Tag, Typography, message } from "antd";
import { useSelector } from "react-redux";
import { PageHeader } from "../../components/GeneralComponents";
import { policyService } from "../../services/policyService";

const cop = (value) => value == null ? "No definido" : new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
const purposeOptions = [
  { value: "negocio", label: "Negocio" },
  { value: "herramientas", label: "Herramientas" },
  { value: "estudio", label: "Estudio" },
  { value: "hogar", label: "Hogar" },
  { value: "otro", label: "Otro" }
];

export default function PoliciesPage() {
  const role = useSelector((state) => state.auth.user?.role);
  const canManage = role === "analista_riesgo";
  const [form] = Form.useForm();
  const [active, setActive] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const versions = await policyService.list();
      let activePolicy = null;
      try { activePolicy = await policyService.getActive(); }
      catch (err) { if (err.response?.status !== 404) throw err; }
      setActive(activePolicy);
      setPolicies(versions);
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible cargar las políticas de crédito.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createVersion = async (values) => {
    setSaving(true); setError("");
    try {
      const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ""));
      await policyService.create(payload);
      message.success("Nueva versión de política creada y auditada.");
      form.resetFields();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "No fue posible crear la versión de política.");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "Política", dataIndex: "name", key: "name" },
    { title: "Versión", dataIndex: "version", key: "version" },
    { title: "Vigencia desde", dataIndex: "effectiveFrom", key: "effectiveFrom", render: (value) => value ? new Date(value).toLocaleDateString("es-CO") : "—" },
    { title: "Estado", dataIndex: "active", key: "active", render: (value) => <Tag color={value ? "success" : "default"}>{value ? "Activa" : "Histórica"}</Tag> }
  ];

  return (
    <div className="internal-page">
      <PageHeader eyebrow="Configuración" title="Políticas de crédito"
        description="Consulta las reglas vigentes y crea versiones nuevas. Las evaluaciones históricas conservan la versión de política que utilizaron." />
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {loading ? <Card><Spin /></Card> : <>
        <Card className="detail-card">
          <div className="card-heading"><div><span className="eyebrow">Política vigente</span><h2>{active?.name || "Sin política activa"}</h2></div>
            {active && <Tag color="success">Versión {active.version}</Tag>}
          </div>
          {active ? <Descriptions column={{ xs: 1, sm: 2 }} items={[
            { key: "age", label: "Edad mínima", children: active.minimumAge ?? "No definido" },
            { key: "amount", label: "Monto máximo", children: cop(active.maximumAmount) },
            { key: "term", label: "Plazo máximo", children: active.maximumTermMonths ? `${active.maximumTermMonths} meses` : "No definido" },
            { key: "ratio", label: "Máxima relación deuda/ingreso", children: active.maxDebtRatio == null ? "No definido" : `${(active.maxDebtRatio * 100).toFixed(1)} %` },
            { key: "rate", label: "Tasa anual", children: active.annualInterestRate == null ? "No definida" : `${active.annualInterestRate} %` },
            { key: "loans", label: "Préstamos simultáneos", children: active.maximumSimultaneousLoans ?? "No definido" },
            { key: "purposes", label: "Propósitos permitidos", children: active.allowedPurposes?.join(", ") || "No definidos" },
            { key: "residence", label: "Exige residencia verificada", children: active.requireVerifiedResidence === false ? "No" : "Sí" }
          ]} /> : <Typography.Text type="secondary">El analista de riesgo debe crear una política para habilitar evaluaciones con reglas configuradas.</Typography.Text>}
        </Card>

        {canManage && <Card className="detail-card">
          <div className="card-heading"><div><span className="eyebrow">Analista de riesgo</span><h2>Crear nueva versión</h2></div><Tag color="blue">Versionado</Tag></div>
          <Typography.Paragraph>Las políticas anteriores no se editan: al crear otra con el mismo nombre se genera una nueva versión y se conserva la trazabilidad de las evaluaciones anteriores.</Typography.Paragraph>
          <Form form={form} layout="vertical" initialValues={{ requireVerifiedResidence: true }} onFinish={createVersion}>
            <Row gutter={16}>
              <Col xs={24} md={12}><Form.Item name="name" label="Nombre de política" rules={[{ required: true, min: 3, max: 100 }]}><Input /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="description" label="Descripción"><Input maxLength={500} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="minimumAge" label="Edad mínima"><InputNumber min={0} max={120} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="maximumAmount" label="Monto máximo (COP)"><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="maximumTermMonths" label="Plazo máximo (meses)"><InputNumber min={1} max={600} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="maxDebtRatio" label="Máxima relación deuda/ingreso"><InputNumber min={0.01} max={1} step={0.01} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="annualInterestRate" label="Tasa anual (%)"><InputNumber min={0} max={100} step={0.1} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item name="maximumSimultaneousLoans" label="Máximo de préstamos simultáneos"><InputNumber min={0} max={100} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="allowedPurposes" label="Propósitos permitidos" rules={[{ required: true, type: "array", min: 1 }]}><Select mode="multiple" options={purposeOptions} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item name="requireVerifiedResidence" label="Exigir verificación de residencia" valuePropName="checked"><Switch /></Form.Item></Col>
            </Row>
            <Space><Button type="primary" htmlType="submit" loading={saving}>Crear versión</Button><Button onClick={() => form.resetFields()}>Limpiar</Button></Space>
          </Form>
        </Card>}

        <Card className="detail-card">
          <div className="card-heading"><h2>Historial de versiones</h2><Tag>{policies.length} versiones</Tag></div>
          <Table rowKey="id" columns={columns} dataSource={policies} pagination={{ pageSize: 8 }} />
        </Card>
      </>}
    </div>
  );
}
