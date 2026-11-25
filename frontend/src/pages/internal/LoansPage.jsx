import { useEffect, useState } from "react";
import { Button, Card, DatePicker, Descriptions, Drawer, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { ReloadOutlined, EyeOutlined, DollarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PageHeader } from "../../components/GeneralComponents";
import { loanService } from "../../services/loanService";

const cop = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value || 0);
const statusLabels = { PENDING_DISBURSEMENT: "Pendiente de desembolso", ACTIVE: "Activo", PAID: "Pagado", WRITTEN_OFF: "Castigado" };
const statusColors = { PENDING_DISBURSEMENT: "gold", ACTIVE: "green", PAID: "blue", WRITTEN_OFF: "default" };

export default function LoansPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState();
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentForm] = Form.useForm();
  const [collectionForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { const result = await loanService.list({ status }); setLoans(result.data || []); }
    catch (error) { message.error(error.response?.data?.message || "No fue posible cargar los préstamos."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]);

  const openDetail = async (loan) => {
    try { setSelected(await loanService.getById(loan.id)); setDetailOpen(true); }
    catch (error) { message.error(error.response?.data?.message || "No fue posible consultar el préstamo."); }
  };
  const disburse = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await loanService.disburse(selected.id);
      message.success("Desembolso registrado y cronograma generado.");
      await openDetail(selected); await load();
    } catch (error) { message.error(error.response?.data?.message || "No fue posible registrar el desembolso."); }
    finally { setSaving(false); }
  };
  const submitPayment = async (values) => {
    setSaving(true);
    try {
      await loanService.registerPayment(selected.id, {
        amount: values.amount,
        ...(values.reference ? { reference: values.reference } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
        ...(values.paymentDate ? { paymentDate: values.paymentDate.toISOString() } : {}),
      });
      message.success("Pago registrado correctamente.");
      setPaymentOpen(false); paymentForm.resetFields();
      await openDetail(selected); await load();
    } catch (error) { message.error(error.response?.data?.message || "No fue posible registrar el pago."); }
    finally { setSaving(false); }
  };

  const submitCollectionAction = async (values) => {
    setSaving(true);
    try {
      await loanService.registerCollectionAction(selected.id, {
        description: values.description,
        ...(values.result ? { result: values.result } : {}),
      });
      message.success("Gestión de cobro registrada.");
      setCollectionOpen(false);
      collectionForm.resetFields();
      await openDetail(selected);
      await load();
    } catch (error) {
      message.error(error.response?.data?.message || "No fue posible registrar la gestión de cobro.");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Préstamo", dataIndex: "loanNumber", key: "loanNumber" },
    { title: "Solicitante", key: "applicant", render: (_, row) => row.application?.applicant ? `${row.application.applicant.firstName} ${row.application.applicant.lastName}` : "—" },
    { title: "Solicitud", key: "application", render: (_, row) => row.application?.applicationNumber || "—" },
    { title: "Capital", dataIndex: "principal", key: "principal", render: cop },
    { title: "Plazo", dataIndex: "termMonths", key: "termMonths", render: (v) => `${v} meses` },
    { title: "Estado", dataIndex: "status", key: "status", render: (v) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag> },
    { title: "Acciones", key: "actions", render: (_, row) => <Button icon={<EyeOutlined />} onClick={() => openDetail(row)}>Detalle</Button> },
  ];

  return <div className="portal-page">
    <PageHeader eyebrow="Operación financiera" title="Gestión de préstamos" description="Consulta préstamos formalizados, registra desembolsos y administra pagos confirmados." action={<Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>} />
    <Card className="detail-card">
      <Space wrap style={{ marginBottom: 16 }}>
        <Typography.Text strong>Estado:</Typography.Text>
        <Select allowClear placeholder="Todos los estados" style={{ width: 240 }} value={status} onChange={setStatus}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
      </Space>
      <Table rowKey="id" columns={columns} dataSource={loans} loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 900 }} locale={{ emptyText: <Empty description="No hay préstamos para mostrar." /> }} />
    </Card>
    <Drawer title={selected?.loanNumber || "Detalle del préstamo"} width={760} open={detailOpen} onClose={() => setDetailOpen(false)}>
      {selected && <>
        <Descriptions bordered size="small" column={2} items={[
          { key: "principal", label: "Capital", children: cop(selected.principal) },
          { key: "rate", label: "Tasa anual", children: `${selected.annualRate}%` },
          { key: "term", label: "Plazo", children: `${selected.termMonths} meses` },
          { key: "status", label: "Estado", children: <Tag color={statusColors[selected.status]}>{statusLabels[selected.status]}</Tag> },
          { key: "application", label: "Solicitud", children: selected.application?.applicationNumber || "—" },
          { key: "date", label: "Desembolso", children: selected.disbursementDate ? dayjs(selected.disbursementDate).format("DD/MM/YYYY") : "Sin desembolsar" },
        ]} />
        <Space style={{ margin: "18px 0" }} wrap>
          {selected.status === "PENDING_DISBURSEMENT" && <Button type="primary" loading={saving} onClick={() => Modal.confirm({ title: "Confirmar desembolso", content: "Se registrará la fecha de desembolso y se generará el cronograma. La entrega efectiva del dinero ocurre fuera del sistema.", okText: "Confirmar", cancelText: "Cancelar", onOk: disburse })}>Registrar desembolso</Button>}
          {selected.status === "ACTIVE" && <Button type="primary" icon={<DollarOutlined />} onClick={() => setPaymentOpen(true)}>Registrar pago</Button>}
          {selected.status === "ACTIVE" && <Button onClick={() => setCollectionOpen(true)}>Registrar gestión de cobro</Button>}
        </Space>
        <Typography.Title level={5}>Cronograma de pagos</Typography.Title>
        <Table size="small" rowKey="id" dataSource={selected.paymentSchedules || []} pagination={false} scroll={{ x: 650 }} columns={[
          { title: "Cuota", dataIndex: "installment" },
          { title: "Vence", dataIndex: "dueDate", render: (v) => dayjs(v).format("DD/MM/YYYY") },
          { title: "Capital", dataIndex: "principal", render: cop },
          { title: "Interés", dataIndex: "interest", render: cop },
          { title: "Total", dataIndex: "totalDue", render: cop },
          { title: "Abonado", dataIndex: "paidAmount", render: cop },
          { title: "Estado", dataIndex: "status" },
        ]} />
        <Typography.Title level={5} style={{ marginTop: 24 }}>Pagos registrados</Typography.Title>
        <Table size="small" rowKey="id" dataSource={selected.payments || []} pagination={false} columns={[
          { title: "Fecha", dataIndex: "paymentDate", render: (v) => dayjs(v).format("DD/MM/YYYY") },
          { title: "Valor", dataIndex: "amount", render: cop },
          { title: "Referencia", dataIndex: "reference", render: (v) => v || "—" },
          { title: "Registrado por", dataIndex: "recordedById" },
        ]} />
        <Typography.Title level={5} style={{ marginTop: 24 }}>Gestiones de cobro</Typography.Title>
        <Table size="small" rowKey="id" dataSource={selected.collectionActions || []} pagination={{ pageSize: 5 }} locale={{ emptyText: "No hay gestiones registradas." }} columns={[
          { title: "Fecha", dataIndex: "performedAt", render: (value) => dayjs(value).format("DD/MM/YYYY HH:mm") },
          { title: "Gestión realizada", dataIndex: "description" },
          { title: "Resultado", dataIndex: "result", render: (value) => value || "—" },
          { title: "Registrado por", dataIndex: "recordedById" },
        ]} />
      </>}
    </Drawer>
    <Modal title="Registrar pago" open={paymentOpen} onCancel={() => setPaymentOpen(false)} onOk={() => paymentForm.submit()} confirmLoading={saving} okText="Registrar pago" cancelText="Cancelar">
      <Form form={paymentForm} layout="vertical" onFinish={submitPayment} initialValues={{ paymentDate: dayjs() }}>
        <Form.Item name="amount" label="Valor recibido (COP)" rules={[{ required: true, message: "Ingresa el valor recibido." }, { type: "number", min: 1, message: "El valor debe ser positivo." }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="paymentDate" label="Fecha del pago"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabledDate={(date) => date.isAfter(dayjs(), "day")} /></Form.Item>
        <Form.Item name="reference" label="Referencia"><Input maxLength={100} /></Form.Item>
        <Form.Item name="notes" label="Observaciones"><Input.TextArea maxLength={500} rows={3} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Registrar gestión de cobro" open={collectionOpen} onCancel={() => setCollectionOpen(false)} onOk={() => collectionForm.submit()} confirmLoading={saving} okText="Guardar gestión" cancelText="Cancelar">
      <Form form={collectionForm} layout="vertical" onFinish={submitCollectionAction}>
        <Form.Item name="description" label="Gestión realizada" rules={[{ required: true, min: 10, message: "Describe la gestión realizada (mínimo 10 caracteres)." }]}>
          <Input.TextArea maxLength={1000} rows={4} placeholder="Describe la gestión de seguimiento o cobro realizada." />
        </Form.Item>
        <Form.Item name="result" label="Resultado u observaciones">
          <Input.TextArea maxLength={1000} rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  </div>;
}
