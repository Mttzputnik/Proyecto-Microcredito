import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import LoginPage from "../pages/auth/LoginPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import RegisterPage from "../pages/auth/RegisterPage";
import LandingPage from "../pages/LandingPage";
import ApplicantLayout from "../layouts/ApplicantLayout";
import InternalLayout from "../layouts/InternalLayout";
import ApplicantHomePage from "../pages/applicant/ApplicantHomePage";
import ApplicationPage from "../pages/applicant/ApplicationPage";
import NewApplicationPage from "../pages/applicant/NewApplicationPage";
import PaymentSchedulePage from "../pages/applicant/PaymentSchedulePage";
import ReconsiderationPage from "../pages/applicant/ReconsiderationPage";
import LoanPage from "../pages/applicant/LoanPage";
import HelpPage from "../pages/applicant/HelpPage";
import InternalDashboardPage from "../pages/internal/InternalDashboardPage";
import ApplicationsPage from "../pages/internal/ApplicationsPage";
import ApplicationDetailPage from "../pages/internal/ApplicationDetailPage";
import ApplicantsPage from "../pages/internal/ApplicantsPage";
import ApplicantDetailPage from "../pages/internal/ApplicantDetailPage";
import RiskEvaluationPage from "../pages/internal/RiskEvaluationPage";
import PoliciesPage from "../pages/internal/PoliciesPage";
import AuditPage from "../pages/internal/AuditPage";
import ReportsPage from "../pages/internal/ReportsPage";
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

const CREDIT_OFFICERS = ["CREDIT_OFFICER", "oficial_credito"];
const INTERNAL_ACTORS = [
  ...CREDIT_OFFICERS,
  "analista_riesgo",
  "administrativo",
  "comite_supervisor",
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
      <Route path="/registro" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute roles={["solicitante"]} />}>
          <Route path="/applicant" element={<ApplicantLayout />}>
            <Route index element={<ApplicantHomePage />} />
            <Route path="application" element={<ApplicationPage />} />
            <Route path="application/new" element={<NewApplicationPage />} />
            <Route path="application/reconsideration" element={<ReconsiderationPage />} />
            <Route path="loan" element={<LoanPage />} />
            <Route path="loan/schedule" element={<PaymentSchedulePage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute roles={INTERNAL_ACTORS} />}>
          <Route path="/internal" element={<InternalLayout />}>
            <Route index element={<InternalDashboardPage />} />

            <Route element={<RoleRoute roles={CREDIT_OFFICERS} />}>
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="applications/:id" element={<ApplicationDetailPage />} />
              <Route path="applications/:id/review" element={<RiskEvaluationPage />} />
              <Route path="applicants" element={<ApplicantsPage />} />
              <Route path="applicants/:id" element={<ApplicantDetailPage />} />
            </Route>

            <Route element={<RoleRoute roles={["analista_riesgo", ...CREDIT_OFFICERS]} />}>
              <Route path="policies" element={<PoliciesPage />} />
            </Route>

            <Route element={<RoleRoute roles={["administrativo", "comite_supervisor"]} />}>
              <Route path="audit" element={<AuditPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/sin-permisos" element={<UnauthorizedPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
