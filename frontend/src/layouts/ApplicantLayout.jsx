import { QuestionCircleOutlined, HomeOutlined, FileTextOutlined, WalletOutlined } from "@ant-design/icons";
import { Layout, Menu } from "antd";
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
  const selected = items.find((item) => location.pathname === item.key)?.key || "/applicant";
  return <Layout className="applicant-layout"><header className="applicant-topbar"><div className="brand-mark"><span className="brand-symbol">+</span><span>Solidaridad <strong>Microfinanzas</strong></span></div><div className="user-summary"><span>{user?.name}</span><small>{roleLabels[user?.role]}</small></div></header><main className="applicant-content"><Outlet /></main><nav className="applicant-bottom-nav">{items.map((item) => <NavLink key={item.key} to={item.key} className={selected === item.key ? "active" : ""}>{item.icon}<span>{item.label}</span></NavLink>)}</nav></Layout>;
}
