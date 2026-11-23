import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { authService } from "./services/authService";
import { clearSession, setAuthStatus, setCurrentUser } from "./store/authSlice";

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    let active = true;
    const handleUnauthorized = () => dispatch(clearSession());
    window.addEventListener("microcredito:unauthorized", handleUnauthorized);

    if (token && authService.isApiMode) {
      authService.getCurrentUser()
        .then((user) => { if (active) dispatch(setCurrentUser(user)); })
        .catch(() => { if (active) dispatch(clearSession()); });
    } else if (token) {
      dispatch(setAuthStatus("authenticated"));
    }

    return () => {
      active = false;
      window.removeEventListener("microcredito:unauthorized", handleUnauthorized);
    };
  }, [dispatch, token]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
