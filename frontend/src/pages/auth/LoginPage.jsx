import { LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { setSession } from "../../store/authSlice";
import { roleHome } from "../../routes/navigation.jsx";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const onFinish = async (values) => {
    setLoading(true);
    setError("");
    try {
      const session = await authService.login(values);
      dispatch(setSession(session));
      navigate(location.state?.from?.pathname || roleHome(session.user.role), {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "No fue posible iniciar sesión.",
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
          <span className="eyebrow">Cooperativa financiera</span>
          <h1>Oportunidades que crecen contigo.</h1>
          <p>
            Ingresa con tus credenciales para acceder al espacio que corresponde
            a tu perfil.
          </p>
        </div>
        <div className="login-assurance">
          <SafetyCertificateOutlined />
          <span>Tu conexión está protegida.</span>
        </div>
      </div>
      <Card className="login-card">
        <div className="login-card-heading">
          <div className="login-icon">
            <LockOutlined />
          </div>
          <Typography.Title level={2}>Ingresa a tu portal</Typography.Title>
          <p>Usa el correo y la contraseña registrados en la cooperativa.</p>
        </div>
        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            className="login-alert"
          />
        )}
        <Form layout="vertical" onFinish={onFinish}>
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
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: "Escribe tu contraseña" },
              {
                min: 6,
                message: "La contraseña debe tener al menos 6 caracteres",
              },
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Escribe tu contraseña"
              autoComplete="current-password"
            />
          </Form.Item>
          <div className="login-options">
            <Link to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
          </div>
          <Button
            htmlType="submit"
            type="primary"
            size="large"
            block
            loading={loading}
          >
            Ingresar al portal
          </Button>
        </Form>
        <p className="demo-note">
          Modo local: si `VITE_AUTH_MODE=mock`, puedes usar cualquier contraseña
          de 6 caracteres con un correo demo.
        </p>
      </Card>
    </main>
  );
}
