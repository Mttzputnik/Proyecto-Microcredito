import { FileTextOutlined, HomeOutlined, QuestionCircleOutlined, WalletOutlined } from "@ant-design/icons";
import { Layout } from "antd";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { roleLabels } from "../mocks/data";

const items = [
  { key: "/applicant", icon: <HomeOutlined />, label: "Inicio" },
  { key: "/applicant/application", icon: <FileTextOutlined />, label: "Mi solicitud" },
  { key: "/applicant/loan", icon: <WalletOutlined />, label: "Mi préstamo" },
  { key: "/applicant/help", icon: <QuestionCircleOutlined />, label: "Ayuda" },
];

export default function ApplicantLayout() {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();
  const selected = items.find((item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`))?.key || "/applicant";
  const initials = (user?.name || "S").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <Layout className="applicant-layout">
    <header className="applicant-topbar"><div className="applicant-topbar-main">
      <div className="brand-mark"><span className="brand-symbol">+</span><span>Solidaridad <strong>Microfinanzas</strong></span></div>
      <nav className="applicant-desktop-nav" aria-label="Navegación principal del solicitante">{items.map((item) => <NavLink key={item.key} to={item.key} className={selected === item.key ? "active" : ""}>{item.icon}<span>{item.label}</span></NavLink>)}</nav>
      <div className="applicant-user-block"><span className="user-avatar">{initials}</span><div className="user-summary"><span>{user?.name || "Solicitante"}</span><small>{roleLabels[user?.role] || "Mi cuenta"}</small></div></div>
    </div></header>
    <main className="applicant-content"><Outlet /></main>
    <nav className="applicant-bottom-nav" aria-label="Navegación inferior del solicitante">{items.map((item) => <NavLink key={item.key} to={item.key} className={selected === item.key ? "active" : ""}>{item.icon}<span>{item.label}</span></NavLink>)}</nav>
  </Layout>;
}
