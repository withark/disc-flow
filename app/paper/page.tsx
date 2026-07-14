import type { Metadata } from "next";
import { PaperAssessment } from "../paper-assessment";

export const metadata: Metadata = {
  title: "현장용 DISC 검사지 | DISC FLOW",
  description: "현장에서 인쇄해 사용할 수 있는 한 장짜리 DISC 행동유형 검사지입니다.",
};

export default function PaperPage() {
  return <PaperAssessment />;
}
