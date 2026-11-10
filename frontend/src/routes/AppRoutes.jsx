import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import LoginPage from "../pages/auth/LoginPage";
import ApplicantLayout from "../layouts/ApplicantLayout";
import InternalLayout from "../layouts/InternalLayout";
import ApplicantHomePage from "../pages/applicant/ApplicantHomePage";
import ApplicationPage from "../pages/applicant/ApplicationPage";
import LoanPage from "../pages/applicant/LoanPage";
import HelpPage from "../pages/applicant/HelpPage";
import InternalDashboardPage from "../pages/internal/InternalDashboardPage";
import ApplicationsPage from "../pages/internal/ApplicationsPage";
import PoliciesPage from "../pages/internal/PoliciesPage";
import AuditPage from "../pages/internal/AuditPage";
import UnauthorizedPage from "../pages/shared/UnauthorizedPage";

function ProtectedRoute() {
  const token = useSelector((state) => state.auth.token);
  const location = useLocation();
  return token ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

function RoleRoute({ roles }) {
  const role = useSelector((state) => state.auth.user?.role);
  return roles.includes(role) ? <Outlet /> : <Navigate to="/sin-permisos" replace />;
}

export default function AppRoutes() {
 return <Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedRoute />}><Route element={<RoleRoute roles={["solicitante"]} />}><Route path="/applicant" element={<ApplicantLayout />}><Route index element={<ApplicantHomePage />} /><Route path="application" element={<ApplicationPage />} /><Route path="loan" element={<LoanPage />} /><Route path="help" element={<HelpPage />} /></Route></Route><Route element={<RoleRoute roles={["oficial_credito", "analista_riesgo", "administrativo", "comite_supervisor"]} />}><Route path="/internal" element={<InternalLayout />}><Route index element={<InternalDashboardPage />} /><Route path="applications" element={<ApplicationsPage />} /><Route path="applications/:id" element={<ApplicationsPage />} /><Route path="policies" element={<PoliciesPage />} /><Route path="audit" element={<AuditPage />} /></Route></Route></Route><Route path="/sin-permisos" element={<UnauthorizedPage />} /><Route path="/" element={<HomeRedirect />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}

function HomeRedirect() { const role = useSelector((state) => state.auth.user?.role); return <Navigate to={role === "solicitante" ? "/applicant" : role ? "/internal" : "/login"} replace />; }
