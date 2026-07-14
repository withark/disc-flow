import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DiscAssessment } from "../app/disc-assessment";
import { PaperAssessment } from "../app/paper-assessment";
import "../app/globals.css";

const paperView = /\/paper\/?$/.test(window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {paperView ? <PaperAssessment /> : <DiscAssessment initialView={/\/admin\/?$/.test(window.location.pathname) ? "admin" : "info"} />}
  </StrictMode>,
);
