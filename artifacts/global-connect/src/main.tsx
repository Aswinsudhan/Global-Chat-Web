import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// When deployed with a separate backend (e.g. Render), point the API client at it
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl as string);
}

createRoot(document.getElementById("root")!).render(<App />);
