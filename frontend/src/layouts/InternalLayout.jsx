import {
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Input, Layout, Menu, Space, Tag } from "antd";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearSession } from "../store/authSlice";
import { toggleSider } from "../store/uiSlice";
import { roleLabels } from "../mocks/data";
import { internalNavigation } from "../routes/navigation";

const { Sider, Header, Content } = Layout;
export default function InternalLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const collapsed = useSelector((state) => state.ui.siderCollapsed);
  const location = useLocation();
  const logout = () => {
    dispatch(clearSession());
    navigate("/login");
  };
  const visibleItems = internalNavigation
    .filter((item) => item.roles.includes(user?.role))
    .map((item) => ({
      key: item.key,
      icon: item.icon,
      label: <NavLink to={item.key}>{item.label}</NavLink>,
    }));
  const selectedKey =
    visibleItems
      .map((item) => item.key)
      .filter(
        (key) =>
          location.pathname === key || location.pathname.startsWith(`${key}/`),
      )
      .sort((a, b) => b.length - a.length)[0] || "/internal";
  return (
    <Layout className="internal-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} width={248}>
        <div className="internal-brand">
          <span className="brand-symbol">+</span>
          {!collapsed && (
            <strong>
              Solidaridad
              <br />
              Microfinanzas
            </strong>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleItems}
        />
      </Sider>
      <Layout>
        <Header className="internal-header">
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => dispatch(toggleSider())}
              aria-label="Cambiar tamaño del menú"
            />
            <Input
              prefix={<SearchOutlined />}
              placeholder="Buscar solicitud o persona"
              className="header-search"
            />
          </Space>
          <Space>
            <Button
              type="text"
              icon={<BellOutlined />}
              aria-label="Ver alertas"
            />
            <Tag color="blue">{roleLabels[user?.role]}</Tag>
            <Avatar>{user?.name?.[0]}</Avatar>
            <Button type="link" onClick={logout}>
              Cerrar sesión
            </Button>
          </Space>
        </Header>
        <Content className="internal-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
