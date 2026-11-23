import { useState } from "react";
import { Alert, Button, Card, Form, Input, Result } from "antd";
import {
  ArrowLeftOutlined,
  InfoCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/GeneralComponents";
import { reconsiderationService } from "../../services/reconsiderationService";

export default function ReconsiderationPage() {
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (values) => {
    setLoading(true);
    setError("");
    try {
      const result = await reconsiderationService.submit({
        applicationNumber: values.applicationNumber.trim(),
        accessToken: values.accessToken.trim(),
        applicantMessage: values.applicantMessage.trim(),
      });
      setSubmitted(result);
      form.resetFields();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No fue posible enviar la reconsideración. Verifica los datos e inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="portal-page">
        <Result
          status="success"
          title="Reconsideración recibida"
          subTitle="La solicitud fue asignada a un oficial diferente. La decisión original y los datos iniciales permanecen intactos."
          extra={[
            <p key="reference">Referencia: {submitted.id}</p>,
            <Link key="back" to="/applicant/application"><Button type="primary">Volver a mi solicitud</Button></Link>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="Mi solicitud"
        title="Pedir reconsideración"
        description="Puedes solicitar una revisión una sola vez si tienes información complementaria o argumentos nuevos."
        action={<Button icon={<ArrowLeftOutlined />}><Link to="/applicant/application">Volver a mi solicitud</Link></Button>}
      />
      <Alert
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        message="La reconsideración no es una aprobación automática."
        description="Será revisada por un oficial distinto al responsable de la decisión original. La solicitud y la decisión inicial no se modificarán."
      />
      <Card className="detail-card reconsideration-card">
        <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional">
          <Form.Item
            name="applicationNumber"
            label="Número de solicitud"
            rules={[{ required: true, message: "Ingresa el número de solicitud." }]}
          >
            <Input placeholder="MC-2026-XXXXXXXX" autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="accessToken"
            label="Código privado de consulta"
            rules={[{ required: true, message: "Ingresa el código privado." }]}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="applicantMessage"
            label="Información complementaria o argumentos nuevos"
            rules={[
              { required: true, message: "Describe la información nueva." },
              { min: 30, message: "Escribe al menos 30 caracteres." },
              { max: 2000, message: "No superes los 2000 caracteres." },
            ]}
          >
            <Input.TextArea
              rows={6}
              showCount
              maxLength={2000}
              placeholder="Explica qué información nueva aportas o qué circunstancia debe revisar el oficial."
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" loading={loading} icon={<SendOutlined />}>
            Enviar reconsideración
          </Button>
          {error && <Alert className="form-alert" type="error" showIcon message={error} />}
        </Form>
      </Card>
    </div>
  );
}
