import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import { Provider } from "react-redux";
import App from "./App.jsx";
import { store } from "./store/index.js";
import { theme } from "./theme/index.js";
import "antd/dist/reset.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><Provider store={store}><ConfigProvider theme={theme}><App /></ConfigProvider></Provider></React.StrictMode>);
