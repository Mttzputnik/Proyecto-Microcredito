import {
  ArrowLeftOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/authService";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submit = async ({ email }) => {
    setLoading(true);
    setError("");
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No fue posible procesar la solicitud. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-page">
      <div className="login-aside">
        <div className="brand-mark">
          <span className="brand-symbol">+</span>
          <span>
            Solidaridad <strong>Microfinanzas</strong>
          </span>
        </div>
        <div>
          <span className="eyebrow">Acceso seguro</span>
          <h1>Recupera el control de tu cuenta.</h1>
          <p>Te enviaremos instrucciones al correo asociado a tu perfil.</p>
        </div>
        <div className="login-assurance">
          <SafetyCertificateOutlined />
          <span>Nunca compartiremos tu contraseña.</span>
        </div>
      </div>
      <Card className="login-card">
        <div className="login-card-heading">
          <div className="login-icon">
            <LockOutlined />
          </div>
          <Typography.Title level={2}>Recuperar contraseña</Typography.Title>
          <p>Escribe el correo con el que te registraste.</p>
        </div>
        {sent ? (
          <Alert
            type="success"
            showIcon
            message="Revisa tu correo"
            description="Si existe una cuenta asociada, recibirás instrucciones para recuperar el acceso."
            action={
              <Link to="/login">
                <Button type="link">Volver al ingreso</Button>
              </Link>
            }
          />
        ) : (
          <Form layout="vertical" onFinish={submit}>
            {error && (
              <Alert
                type="error"
                showIcon
                message={error}
                className="login-alert"
              />
            )}
            <Form.Item
              name="email"
              label="Correo electrónico"
              rules={[
                {
                  required: true,
                  type: "email",
                  message: "Escribe un correo válido",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="nombre@ejemplo.com"
                autoComplete="email"
              />
            </Form.Item>
            <Button
              htmlType="submit"
              type="primary"
              size="large"
              block
              loading={loading}
            >
              Enviar instrucciones
            </Button>
            <Button type="link" block icon={<ArrowLeftOutlined />}>
              <Link to="/login">Volver al ingreso</Link>
            </Button>
          </Form>
        )}
      </Card>
    </main>
  );
}
