import { BellOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar, Button, Input, Layout, Menu, Space, Tag, Typography } from "antd";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearSession } from "../store/authSlice";
import { toggleSider } from "../store/uiSlice";
import { roleLabels } from "../mocks/data";
import { internalNavigation } from "../routes/navigation";
const { Sider, Header, Content } = Layout;

export default function InternalLayout() {
  const dispatch = useDispatch(); const navigate = useNavigate(); const { user } = useSelector((state) => state.auth); const collapsed = useSelector((state) => state.ui.siderCollapsed); const location = useLocation();
  const role = roleLabels[user?.role] || user?.role || "Equipo interno"; const displayName = user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Usuario"; const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const logout = () => { dispatch(clearSession()); navigate("/"); };
  const visibleItems = internalNavigation.filter((item) => item.roles.includes(user?.role)).map((item) => ({ key: item.key, icon: item.icon, label: <NavLink to={item.key}>{item.label}</NavLink> }));
  const selectedKey = visibleItems.map((item) => item.key).filter((key) => location.pathname === key || location.pathname.startsWith(`${key}/`)).sort((a, b) => b.length - a.length)[0] || "/internal";
  return <Layout className="internal-layout"><Sider trigger={null} collapsible collapsed={collapsed} width={256}>
    <div className="internal-brand"><span className="brand-symbol">+</span>{!collapsed && <div><strong>Solidaridad</strong><small>Microfinanzas</small></div>}</div>{!collapsed && <div className="internal-nav-caption">Menú de trabajo</div>}<Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={visibleItems} />{!collapsed && <div className="internal-side-note"><span>Sesión activa</span><strong>{role}</strong><small>Información protegida</small></div>}
  </Sider><Layout><Header className="internal-header"><Space className="internal-header-left"><Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => dispatch(toggleSider())} aria-label="Cambiar tamaño del menú" /><div className="internal-context"><Typography.Text className="internal-context-kicker">Portal interno</Typography.Text><Typography.Text strong>{role}</Typography.Text></div><Input prefix={<SearchOutlined />} placeholder="Buscar solicitud o persona" className="header-search" /></Space><Space className="internal-header-actions"><Button type="text" className="header-alert" icon={<BellOutlined />} aria-label="Ver alertas"><span className="alert-dot" /></Button><Tag color="blue" className="role-tag">{role}</Tag><Avatar className="header-avatar">{initials}</Avatar><Button type="link" onClick={logout}>Cerrar sesión</Button></Space></Header><Content className="internal-content"><Outlet /></Content></Layout></Layout>;
}
