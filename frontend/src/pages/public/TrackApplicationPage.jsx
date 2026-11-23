import { useState } from "react";
import { Alert, Button, Card, Form, Input, Result, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { trackLoanApplication } from "../../services/applicationService";

const statusLabels = {
  PENDING_ASSIGNMENT: "Pendiente de asignación",
  SUBMITTED: "Recibida",
  UNDER_REVIEW: "En revisión",
  NEEDS_INFORMATION: "Requiere información",
  APPROVED: "Aprobada",
  REJECTED: "No aprobada",
  CANCELLED: "Cancelada"
};

export default function TrackApplicationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await trackLoanApplication({
        applicationNumber: values.applicationNumber.trim(),
        accessToken: values.accessToken.trim()
      });
      setResult(data);
      form.setFieldValue("accessToken", "");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No fue posible consultar la solicitud. Verifica los datos e inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-intro">
        <Link to="/" className="brand-mark"><span className="brand-symbol">+</span><span>Solidaridad <strong>Microfinanzas</strong></span></Link>
        <div>
          <span className="eyebrow">Seguimiento seguro</span>
          <h1>Consulta el estado de tu solicitud.</h1>
          <p>Ingresa el número de caso y el código privado que recibiste al registrar tu solicitud. No necesitas crear una cuenta.</p>
        </div>
        <Link to="/">Volver a la página principal</Link>
      </section>
      <Card className="register-card">
        <Typography.Title level={2}>Consultar solicitud</Typography.Title>
        <p className="register-description">Por seguridad, ambos datos son necesarios. El código privado no se envía en la dirección de la página.</p>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 18 }} />}
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="applicationNumber" label="Número de solicitud" rules={[{ required: true, message: "Ingresa el número de solicitud." }]}>
            <Input size="large" autoComplete="off" placeholder="MC-2026-XXXXXXXX" />
          </Form.Item>
          <Form.Item name="accessToken" label="Código privado de consulta" rules={[{ required: true, message: "Ingresa el código privado." }]}>
            <Input.Password size="large" autoComplete="off" />
          </Form.Item>
          <Button htmlType="submit" type="primary" size="large" block loading={loading}>Consultar estado</Button>
        </Form>
        {result && (
          <Result
            status="info"
            title="Solicitud encontrada"
            subTitle={result.applicationNumber}
            extra={
              <div>
                <Tag color="blue">{statusLabels[result.status] || result.status}</Tag>
                <p style={{ marginTop: 12 }}>Fecha de registro: {new Date(result.createdAt).toLocaleString("es-CO")}</p>
                <p>Última actualización: {new Date(result.updatedAt).toLocaleString("es-CO")}</p>
              </div>
            }
          />
        )}
      </Card>
    </main>
  );
}
