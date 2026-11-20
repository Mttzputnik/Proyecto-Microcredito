import { LockOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { Link } from "react-router-dom";
export default function UnauthorizedPage() { return <main className="empty-page"><LockOutlined /><h1>No tienes permisos para ver esta página</h1><p>Tu perfil no tiene acceso a este espacio. Si crees que es un error, consulta al administrador.</p><Button type="primary"><Link to="/">Volver al inicio</Link></Button></main>; }
