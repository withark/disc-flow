import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DiscAssessment } from "../app/disc-assessment";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DiscAssessment />
  </StrictMode>,
);
