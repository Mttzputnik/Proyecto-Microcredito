import { useState } from "react";
import { Alert, Button, Card, Form, Input, Upload } from "antd";
import {
  ArrowLeftOutlined,
  FileAddOutlined,
  InfoCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import { mockRejectedApplication } from "../../mocks/reportData";
import { reconsiderationService } from "../../services/reportService";

export default function ReconsiderationPage() {
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (values) => {
    setLoading(true);
    setError("");
    try {
      await reconsiderationService.submit({
        applicationId: mockRejectedApplication.id,
        ...values,
      });
      setSubmitted(true);
    } catch {
      setError("No fue posible enviar la reconsideración. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };
  if (submitted)
    return (
      <div className="portal-page">
        <Card className="success-card inline-success">
          <div className="success-icon">✓</div>
          <span className="eyebrow">Solicitud enviada</span>
          <h1>Recibimos tu reconsideración</h1>
          <p>
            La cooperativa revisará la información adicional y te comunicará si
            el caso puede volver a evaluarse. Esta solicitud no garantiza la
            aprobación.
          </p>
          <Link to="/applicant/application">
            <Button type="primary" size="large">
              Volver a mi solicitud
            </Button>
          </Link>
        </Card>
      </div>
    );
  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="Mi solicitud"
        title="Pedir reconsideración"
        description="Si tienes información nueva o quieres aclarar una circunstancia, puedes solicitar una revisión del rechazo."
        action={
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/applicant/application">Volver a mi solicitud</Link>
          </Button>
        }
      />
      <Alert
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        message="La reconsideración no es una aprobación automática."
        description="Explica qué cambió o qué información adicional debería revisar la cooperativa. Solo se puede solicitar una reconsideración por este caso."
      />
      <Card className="detail-card reconsideration-card">
        <div className="rejected-summary">
          <span className="eyebrow">{mockRejectedApplication.id}</span>
          <h2>{mockRejectedApplication.purpose}</h2>
          <p>{mockRejectedApplication.reason}</p>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          requiredMark="optional"
        >
          <Form.Item
            name="reason"
            label="¿Qué información nueva quieres que revisemos?"
            rules={[
              { required: true, message: "Cuéntanos qué cambió" },
              { min: 30, message: "Escribe al menos 30 caracteres" },
            ]}
          >
            <Input.TextArea
              rows={6}
              showCount
              maxLength={1000}
              placeholder="Ej. Ahora puedo adjuntar los extractos y soportes de ingresos que no estaban disponibles..."
            />
          </Form.Item>
          <Form.Item name="documents" label="Soportes adicionales (opcional)">
            <Upload beforeUpload={() => false} maxCount={3}>
              <Button icon={<FileAddOutlined />}>Seleccionar archivos</Button>
            </Upload>
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            icon={<SendOutlined />}
          >
            Enviar reconsideración
          </Button>
          {error && (
            <Alert
              className="form-alert"
              type="error"
              showIcon
              message={error}
            />
          )}
        </Form>
      </Card>
    </div>
  );
}
