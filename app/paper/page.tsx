import type { Metadata } from "next";
import { PaperAssessment } from "../paper-assessment";

export const metadata: Metadata = {
  title: "현장용 DISC 검사지 | DISC FLOW",
  description: "현장에서 인쇄해 사용하는 질문지 1장과 채점·해설지 1장으로 구성된 DISC 행동유형 검사입니다.",
};

export default function PaperPage() {
  return <PaperAssessment />;
}
