import type { Metadata } from "next";
import { DiscAssessment } from "../disc-assessment";

export const metadata: Metadata = {
  title: "관리자 대시보드 | DISC FLOW",
  description: "DISC 응답 현황, 조 편성 및 팀 디브리핑 관리자 화면입니다.",
};

export default function AdminPage() {
  return <DiscAssessment initialView="admin" />;
}
