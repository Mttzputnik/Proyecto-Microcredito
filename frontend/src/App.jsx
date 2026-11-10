import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { clearSession } from "./store/authSlice";

export default function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    const handleUnauthorized = () => dispatch(clearSession());
    window.addEventListener("microcredito:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("microcredito:unauthorized", handleUnauthorized);
  }, [dispatch]);
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
