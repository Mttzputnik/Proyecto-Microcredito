import { useEffect, useState } from "react";
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { PageHeader } from "../../components/GeneralComponents";
import { loanService } from "../../services/loanService";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);
const statusColor = {
  PENDING_REVIEW: "gold", PENDING_COMMITTEE_REVIEW: "orange", PENDING_ACCEPTANCE: "processing",
  ACTIVE: "green", REJECTED: "red"
};
const statusLabel = {
  PENDING_REVIEW: "Pendiente de revisión", PENDING_COMMITTEE_REVIEW: "Escalada al comité",
  PENDING_ACCEPTANCE: "Pendiente de aceptación", ACTIVE: "Activa", REJECTED: "Rechazada"
};

export default function RestructuringsPage() {
  const role = useSelector((state) => state.auth.user?.role);
  const [policies, setPolicies] = useState([]);
  const [loans, setLoans] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [decision, setDecision] = useState(null);
  const [acceptance, setAcceptance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [requestForm] = Form.useForm();
  const [policyForm] = Form.useForm();
  const [decisionForm] = Form.useForm();
  const [acceptanceForm] = Form.useForm();

  const canCreate = ["administrativo", "CREDIT_OFFICER", "oficial_credito"].includes(role);
  const canDecide = ["CREDIT_OFFICER", "oficial_credito", "comite_supervisor"].includes(role);
  const canConfigure = role === "analista_riesgo";
  const canAccept = role === "administrativo";

  const load = async () => {
    setLoading(true);
    try {
      const policyPromise = canCreate || canConfigure ? loanService.listRestructuringPolicies() : Promise.resolve([]);
      const requestPromise = canDecide || canAccept ? loanService.listRestructurings() : Promise.resolve([]);
      const loanPromise = canCreate ? loanService.list({ status: "ACTIVE", limit: 50 }) : Promise.resolve({ data: [] });
      const [policyRows, requestRows, loanRows] = await Promise.all([policyPromise, requestPromise, loanPromise]);
      setPolicies(policyRows || []);
      setItems(requestRows || []);
      setLoans(loanRows?.data || []);
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible cargar la información de reestructuración.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [role]);

  const submitRequest = async (values) => {
    setSaving(true);
    try {
      await loanService.createRestructuring(values.loanId, {
        policyId: values.policyId,
        reason: values.reason,
        termMonths: values.termMonths,
        ...(values.annualRate !== undefined ? { annualRate: values.annualRate } : {}),
        gracePeriodDays: values.gracePeriodDays ?? 0,
        firstDueDate: values.firstDueDate.toISOString(),
        lateInterestAmount: values.lateInterestAmount ?? 0,
        ...(values.lateInterestEvidence ? { lateInterestEvidence: values.lateInterestEvidence } : {}),
      });
      message.success("Solicitud de reestructuración registrada.");
      setRequestOpen(false); requestForm.resetFields(); await load();
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible registrar la solicitud.");
    } finally { setSaving(false); }
  };

  const submitPolicy = async (values) => {
    setSaving(true);
    try {
      await loanService.createRestructuringPolicy({
        ...values,
        effectiveFrom: values.effectiveFrom.toISOString(),
      });
      message.success("Política de reestructuración publicada.");
      setPolicyOpen(false); policyForm.resetFields(); await load();
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible guardar la política.");
    } finally { setSaving(false); }
  };

  const submitDecision = async (values) => {
    setSaving(true);
    try {
      await loanService.decideRestructuring(decision.id, { outcome: decision.outcome, justification: values.justification });
      message.success(decision.outcome === "APPROVED" ? "Decisión registrada." : "Reestructuración rechazada.");
      setDecision(null); decisionForm.resetFields(); await load();
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible registrar la decisión.");
    } finally { setSaving(false); }
  };

  const submitAcceptance = async (values) => {
    setSaving(true);
    try {
      await loanService.acceptRestructuring(acceptance.id, {
        accepted: true,
        acceptanceMethod: values.acceptanceMethod,
        acceptanceEvidence: values.acceptanceEvidence,
      });
      message.success("Aceptación registrada y nuevo cronograma activado.");
      setAcceptance(null); acceptanceForm.resetFields(); await load();
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible activar el acuerdo.");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "Préstamo", dataIndex: "loanId", key: "loanId", render: (value) => <Typography.Text code>{value}</Typography.Text> },
    { title: "Versión", dataIndex: "version", key: "version" },
    { title: "Saldo reestructurado", dataIndex: "newPrincipal", key: "newPrincipal", render: cop },
    { title: "Tasa anual", dataIndex: "proposedAnnualRate", key: "rate", render: (value) => `${value}%` },
    { title: "Plazo", dataIndex: "proposedTermMonths", key: "term", render: (value) => `${value} meses` },
    { title: "Primer vencimiento", dataIndex: "firstDueDate", key: "due", render: (value) => dayjs(value).format("DD/MM/YYYY") },
    { title: "Estado", dataIndex: "status", key: "status", render: (value) => <Tag color={statusColor[value]}>{statusLabel[value] || value}</Tag> },
    { title: "Acciones", key: "actions", render: (_, row) => <Space wrap>
      {canDecide && (row.status === "PENDING_REVIEW" || (row.status === "PENDING_COMMITTEE_REVIEW" && role === "comite_supervisor")) && <>
        <Button type="primary" size="small" onClick={() => setDecision({ id: row.id, outcome: "APPROVED" })}>Aprobar</Button>
        <Button danger size="small" onClick={() => setDecision({ id: row.id, outcome: "REJECTED" })}>Rechazar</Button>
      </>}
      {canAccept && row.status === "PENDING_ACCEPTANCE" && <Button type="primary" size="small" onClick={() => setAcceptance(row)}>Registrar aceptación</Button>}
    </Space> }
  ];

  return <div className="portal-page">
    <PageHeader eyebrow="Cartera y normalización" title="Reestructuración de préstamos" description="Gestiona acuerdos, decisiones humanas, aceptación del asociado y versiones históricas de los cronogramas." action={<Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>} />
    <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Las condiciones financieras dependen de una política institucional vigente. El sistema bloquea acuerdos cuando faltan parámetros o autorizaciones." />
    {canConfigure && <Card title="Políticas de reestructuración" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setPolicyOpen(true)}>Nueva política</Button>} style={{ marginBottom: 16 }}>
      <Table size="small" rowKey="id" loading={loading} dataSource={policies} pagination={false} columns={[
        { title: "Política", dataIndex: "name" },
        { title: "Versión", dataIndex: "version" },
        { title: "Plazo máximo", dataIndex: "maximumTermMonths", render: (v) => `${v} meses` },
        { title: "Gracia máxima", dataIndex: "maximumGracePeriodDays", render: (v) => `${v} días` },
        { title: "Tasa máxima", dataIndex: "maximumUsuryRate", render: (v) => `${v}%` },
        { title: "Estado", dataIndex: "active", render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Vigente" : "Inactiva"}</Tag> },
      ]} />
    </Card>}
    {canCreate && <Card title="Registrar solicitud de reestructuración" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Typography.Text type="secondary">Solo se admiten préstamos activos y políticas vigentes.</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} disabled={!policies.length || !loans.length} onClick={() => setRequestOpen(true)}>Nueva solicitud</Button>
      </Space>
      {!policies.length && <Alert type="warning" showIcon style={{ marginTop: 12 }} message="No hay una política de reestructuración vigente. El analista de riesgo debe publicar una antes de iniciar acuerdos." />}
    </Card>}
    {(canDecide || canAccept) && <Card title="Solicitudes y acuerdos">
      <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} expandable={{ expandedRowRender: (row) => <div>
        <Typography.Paragraph><strong>Motivo:</strong> {row.reason}</Typography.Paragraph>
        <Typography.Paragraph><strong>Capital pendiente:</strong> {cop(row.principalOutstanding)} · <strong>Interés vencido:</strong> {cop(row.accruedInterestOutstanding)} · <strong>Interés de mora manual:</strong> {cop(row.lateInterestAmount)}</Typography.Paragraph>
        {row.justification && <Typography.Paragraph><strong>Justificación de decisión:</strong> {row.justification}</Typography.Paragraph>}
        {row.acceptanceEvidence && <Typography.Paragraph><strong>Soporte de aceptación:</strong> {row.acceptanceEvidence}</Typography.Paragraph>}
      </div>}} locale={{ emptyText: "No hay solicitudes de reestructuración." }} />
    </Card>}
    <Modal title="Nueva solicitud de reestructuración" open={requestOpen} onCancel={() => setRequestOpen(false)} onOk={() => requestForm.submit()} confirmLoading={saving} width={680}>
      <Form form={requestForm} layout="vertical" onFinish={submitRequest}>
        <Form.Item name="loanId" label="Préstamo activo" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={loans.map((loan) => ({ value: loan.id, label: `${loan.loanNumber} · ${cop(loan.principal)} · ${loan.status}` }))} /></Form.Item>
        <Form.Item name="policyId" label="Política vigente" rules={[{ required: true }]}><Select options={policies.map((policy) => ({ value: policy.id, label: `${policy.name} v${policy.version}` }))} /></Form.Item>
        <Form.Item name="reason" label="Motivo y dificultades de pago" rules={[{ required: true, min: 10 }]}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        <Space style={{ display: "flex" }} align="start">
          <Form.Item name="termMonths" label="Nuevo plazo (meses)" rules={[{ required: true }]}><InputNumber min={1} max={600} /></Form.Item>
          <Form.Item name="annualRate" label="Nueva tasa anual (%)"><InputNumber min={0} max={1000} /></Form.Item>
          <Form.Item name="gracePeriodDays" label="Gracia (días)" initialValue={0}><InputNumber min={0} max={365} /></Form.Item>
        </Space>
        <Form.Item name="firstDueDate" label="Fecha del primer vencimiento" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} disabledDate={(date) => date.isBefore(dayjs(), "day")} /></Form.Item>
        <Form.Item name="lateInterestAmount" label="Intereses de mora manuales (COP; solo si la política lo permite)" initialValue={0}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="lateInterestEvidence" label="Soporte contable del interés de mora (si aplica)"><Input maxLength={1000} /></Form.Item>
        <Alert type="info" showIcon message="El motor actual genera cronogramas mensuales mediante el sistema francés. La periodicidad no mensual requiere una regla institucional y una extensión específica del motor financiero." />
      </Form>
    </Modal>
    <Modal title="Publicar política de reestructuración" open={policyOpen} onCancel={() => setPolicyOpen(false)} onOk={() => policyForm.submit()} confirmLoading={saving} width={720}>
      <Form form={policyForm} layout="vertical" onFinish={submitPolicy} initialValues={{ allowRateChange: false, allowRepeatedRestructuring: false, maximumRestructurings: 1, overdueInstallmentsTreatment: "CAPITALIZE", includeAccruedInterest: false, lateInterestTreatment: "NOT_APPLICABLE", effectiveFrom: dayjs() }}>
        <Form.Item name="name" label="Nombre de política" rules={[{ required: true, min: 3 }]}><Input maxLength={100} /></Form.Item>
        <Space wrap>
          <Form.Item name="maximumTermMonths" label="Plazo máximo (meses)" rules={[{ required: true }]}><InputNumber min={1} max={600} /></Form.Item>
          <Form.Item name="maximumGracePeriodDays" label="Gracia máxima (días)" rules={[{ required: true }]}><InputNumber min={0} max={365} /></Form.Item>
          <Form.Item name="maximumUsuryRate" label="Tasa máxima anual (%)" rules={[{ required: true }]}><InputNumber min={0} max={1000} /></Form.Item>
          <Form.Item name="maximumOfficerApprovalAmount" label="Límite de aprobación del oficial (COP)" rules={[{ required: true }]}><InputNumber min={1} precision={0} /></Form.Item>
          <Form.Item name="maximumRestructurings" label="Máximo de reestructuraciones" rules={[{ required: true }]}><InputNumber min={1} max={20} /></Form.Item>
        </Space>
        <Form.Item name="overdueInstallmentsTreatment" label="Tratamiento de cuotas vencidas" rules={[{ required: true }]}><Select options={[{ value: "CAPITALIZE", label: "Incorporar al nuevo saldo" }, { value: "REQUIRE_PAYMENT", label: "Exigir pago previo" }]} /></Form.Item>
        <Form.Item name="lateInterestTreatment" label="Tratamiento de intereses de mora" rules={[{ required: true }]}><Select options={[{ value: "MANUAL_CAPITALIZE", label: "Capitalización con valor manual validado por contabilidad" }, { value: "WAIVE", label: "Condonar / no incorporar" }, { value: "NOT_APPLICABLE", label: "No aplica (no se calculan automáticamente)" }]} /></Form.Item>
        <Space wrap>
          <Form.Item name="allowRateChange" label="¿Permite cambiar tasa?" rules={[{ required: true }]}><Select options={[{ value: true, label: "Sí" }, { value: false, label: "No" }]} /></Form.Item>
          <Form.Item name="allowRepeatedRestructuring" label="¿Permite reestructuraciones sucesivas?" rules={[{ required: true }]}><Select options={[{ value: true, label: "Sí" }, { value: false, label: "No" }]} /></Form.Item>
          <Form.Item name="includeAccruedInterest" label="¿Capitalizar intereses corrientes vencidos?" rules={[{ required: true }]}><Select options={[{ value: true, label: "Sí" }, { value: false, label: "No" }]} /></Form.Item>
        </Space>
        <Form.Item name="effectiveFrom" label="Vigente desde" rules={[{ required: true }]}><DatePicker showTime style={{ width: "100%" }} /></Form.Item>
        <Alert type="warning" showIcon message="Publicar únicamente parámetros aprobados por el cuerpo directivo y el comité financiero. La tasa máxima debe provenir de la validación legal vigente." />
      </Form>
    </Modal>
    <Modal title={decision?.outcome === "APPROVED" ? "Aprobar reestructuración" : "Rechazar reestructuración"} open={!!decision} onCancel={() => setDecision(null)} onOk={() => decisionForm.submit()} confirmLoading={saving}>
      <Form form={decisionForm} layout="vertical" onFinish={submitDecision}>
        <Form.Item name="justification" label="Justificación obligatoria" rules={[{ required: true, min: 10, message: "Registra una justificación de al menos 10 caracteres." }]}><Input.TextArea rows={4} maxLength={2000} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Registrar aceptación del asociado" open={!!acceptance} onCancel={() => setAcceptance(null)} onOk={() => acceptanceForm.submit()} confirmLoading={saving}>
      <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Registra la aceptación únicamente después de verificar el consentimiento informado del asociado." />
      <Form form={acceptanceForm} layout="vertical" onFinish={submitAcceptance}>
        <Form.Item name="acceptanceMethod" label="Medio de aceptación" rules={[{ required: true }]}><Select options={[{ value: "SIGNED_DOCUMENT", label: "Documento firmado" }, { value: "IN_PERSON", label: "Aceptación presencial" }, { value: "DIGITAL", label: "Aceptación digital" }]} /></Form.Item>
        <Form.Item name="acceptanceEvidence" label="Referencia o soporte verificable" rules={[{ required: true, min: 10 }]}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
