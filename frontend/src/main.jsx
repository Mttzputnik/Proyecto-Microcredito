import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import App from "./App.jsx";
import { store } from "./store.js";
import "antd/dist/reset.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={{ token: { colorPrimary: "#145b8c", borderRadius: 8 } }}>
        <App />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
