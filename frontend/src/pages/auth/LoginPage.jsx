import { LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Select, Typography } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { setSession } from "../../store/authSlice";
import { roleLabels, mockUsers } from "../../mocks/data";

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const onFinish = async (values) => { setLoading(true); setError(""); try { const session = await authService.login(values); dispatch(setSession(session)); navigate(session.user.role === "solicitante" ? "/applicant" : "/internal"); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  const selectedRole = Form.useWatch("role", form);
  const demoEmail = mockUsers.find((user) => user.role === selectedRole)?.email;
  return <main className="login-page"><div className="login-aside"><div className="brand-mark"><span className="brand-symbol">+</span><span>Solidaridad <strong>Microfinanzas</strong></span></div><div><span className="eyebrow">Cooperativa financiera</span><h1>Oportunidades que crecen contigo.</h1><p>Un espacio claro para solicitar, revisar y acompañar cada decisión de crédito.</p></div><div className="login-assurance"><SafetyCertificateOutlined /><span>Entorno de demostración con datos ficticios</span></div></div><Card className="login-card"><div className="login-card-heading"><div className="login-icon"><LockOutlined /></div><Typography.Title level={2}>Ingresa a tu portal</Typography.Title><p>Selecciona el perfil con el que quieres explorar la plataforma.</p></div>{error && <Alert type="error" showIcon message={error} className="login-alert" />}<Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ role: "solicitante" }}><Form.Item name="role" label="Perfil de acceso" rules={[{ required: true, message: "Selecciona un perfil" }]}><Select size="large" options={roleOptions} /></Form.Item><Form.Item name="email" label="Correo electrónico" initialValue={mockUsers[0].email} rules={[{ required: true, type: "email", message: "Escribe un correo válido" }]}><input className="native-input" value={demoEmail} readOnly aria-label="Correo electrónico de demostración" /></Form.Item><Button htmlType="submit" type="primary" size="large" block loading={loading}>Ingresar al portal</Button></Form><p className="demo-note">Modo demostración: no se solicita contraseña. Elige un perfil para continuar.</p></Card></main>;
}
