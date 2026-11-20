import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import ApplicationStatusChip from "../../components/ApplicationStatusChip";
import { applicantService } from "../../services/applicantService";
const cop = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
export default function ApplicantDetailPage() {
  const { id } = useParams();
  const [form] = Form.useForm();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    applicantService
      .getById(id)
      .then((data) => {
        setApplicant(data);
        form.setFieldsValue(data);
      })
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            "No fue posible cargar el solicitante.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id, form]);
  const save = async (values) => {
    setSaving(true);
    try {
      const updated = await applicantService.update(id, values);
      setApplicant((current) => ({ ...current, ...updated }));
      message.success("Los datos del solicitante fueron actualizados.");
    } catch (err) {
      message.error(
        err.response?.data?.message || "No fue posible guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <div className="internal-page">
        <Spin />{" "}
      </div>
    );
  if (error || !applicant)
    return (
      <div className="internal-page">
        <Alert
          type="error"
          showIcon
          message={error || "Solicitante no encontrado."}
        />
      </div>
    );
  return (
    <div className="internal-page">
      <PageHeader
        eyebrow="Personas / Detalle"
        title={`${applicant.firstName} ${applicant.lastName}`}
        description={`Documento ${applicant.documentType || ""} ${applicant.documentNumber || "—"}`}
      />
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="Datos editables de contacto y perfil">
            <Form form={form} layout="vertical" onFinish={save}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="phone" label="Teléfono">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Correo electrónico"
                    rules={[
                      { type: "email", message: "Escribe un correo válido" },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="address" label="Dirección">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="municipality" label="Municipio">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="residenceZone" label="Zona de residencia">
                    <Select
                      options={[
                        { value: "urbana", label: "Urbana" },
                        { value: "rural", label: "Rural" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="occupation" label="Ocupación">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="activityDuration"
                    label="Antigüedad de actividad"
                  >
                    <Select
                      options={["menos-6", "6-12", "1-3", "mas-3"].map(
                        (value) => ({ value, label: value }),
                      )}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="monthlyIncome" label="Ingresos mensuales">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="monthlyExpenses" label="Gastos mensuales">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="dependents" label="Personas a cargo">
                    <InputNumber min={0} max={30} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={saving}>
                Guardar cambios
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Solicitudes relacionadas">
            {applicant.applications?.length ? (
              applicant.applications.map((application) => (
                <div key={application.id} className="related-item">
                  <Link to={`/internal/applications/${application.id}`}>
                    <strong>{application.applicationNumber}</strong>
                  </Link>
                  <div>
                    {cop(application.requestedAmount)} ·{" "}
                    {application.requestedTerm} meses
                  </div>
                  <ApplicationStatusChip status={application.status} />
                </div>
              ))
            ) : (
              <Typography.Text type="secondary">
                Este solicitante aún no tiene solicitudes.
              </Typography.Text>
            )}
            <div style={{ marginTop: 18 }}>
              <Tag>{applicant.municipality || "Municipio no registrado"}</Tag>
              <Tag>{applicant.occupation || "Ocupación no registrada"}</Tag>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
