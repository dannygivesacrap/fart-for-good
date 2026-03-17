import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// localStorage-based storage shim for prototype
// Global keys are shared across all users via localStorage (prototype only)
// In production, replace with server-side storage
window.storage = {
  get: async (key, _isGlobal) => {
    const value = localStorage.getItem(key);
    if (value === null) return null;
    return { value };
  },
  set: async (key, value, _isGlobal) => {
    localStorage.setItem(key, value);
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
