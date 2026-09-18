import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { store } from "./store/store";

// Purchased template theme, in the order index.html loads it.
import "./theme/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./theme/css/materialdesignicons.min.css";
import "./theme/css/template.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
