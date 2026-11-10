import { BellOutlined, DashboardOutlined, FileSearchOutlined, MenuFoldOutlined, MenuUnfoldOutlined, ProfileOutlined, SafetyCertificateOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { Avatar, Button, Input, Layout, Menu, Space, Tag } from "antd";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearSession } from "../store/authSlice";
import { toggleSider } from "../store/uiSlice";
import { roleLabels } from "../mocks/data";

const { Sider, Header, Content } = Layout;
const menuItems = [
  { key: "/internal", roles: ["oficial_credito", "analista_riesgo", "administrativo", "comite_supervisor"], icon: <DashboardOutlined />, label: <NavLink to="/internal">Resumen</NavLink> },
  { key: "/internal/applications", roles: ["oficial_credito", "analista_riesgo", "administrativo"], icon: <FileSearchOutlined />, label: <NavLink to="/internal/applications">Solicitudes</NavLink> },
  { key: "/internal/policies", roles: ["analista_riesgo", "comite_supervisor"], icon: <SafetyCertificateOutlined />, label: <NavLink to="/internal/policies">Políticas</NavLink> },
  { key: "/internal/audit", roles: ["administrativo", "comite_supervisor"], icon: <ProfileOutlined />, label: <NavLink to="/internal/audit">Auditoría</NavLink> },
];

export default function InternalLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const collapsed = useSelector((state) => state.ui.siderCollapsed);
  const location = useLocation();
  const logout = () => { dispatch(clearSession()); navigate("/login"); };
  const visibleItems = menuItems.filter((item) => item.roles.includes(user?.role));
  return <Layout className="internal-layout"><Sider trigger={null} collapsible collapsed={collapsed} width={248}><div className="internal-brand"><span className="brand-symbol">+</span>{!collapsed && <strong>Solidaridad<br />Microfinanzas</strong>}</div><Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={visibleItems} /></Sider><Layout><Header className="internal-header"><Space><Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => dispatch(toggleSider())} aria-label="Cambiar tamaño del menú" /><Input prefix={<SearchOutlined />} placeholder="Buscar solicitud o persona" className="header-search" /></Space><Space><Button type="text" icon={<BellOutlined />} aria-label="Ver alertas" /><Tag color="blue">{roleLabels[user?.role]}</Tag><Avatar>{user?.name?.[0]}</Avatar><Button type="link" onClick={logout}>Cerrar sesión</Button></Space></Header><Content className="internal-content"><Outlet /></Content></Layout></Layout>;
}
