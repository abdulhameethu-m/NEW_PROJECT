import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { BrandingProvider } from "./context/BrandingContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrandingProvider>
      <NotificationProvider>
        <BrowserRouter>
          <ScrollToTop />
          <App />
        </BrowserRouter>
      </NotificationProvider>
    </BrandingProvider>
  </StrictMode>,
);
