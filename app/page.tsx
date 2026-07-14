import type { Metadata } from "next";
import { DiscAssessment } from "./disc-assessment";

export const metadata: Metadata = {
  title: "DISC 행동유형 진단 | DISC FLOW",
  description:
    "24개의 선택으로 나의 행동 경향을 파악하고, 팀의 DISC 분포를 함께 살펴보세요.",
};

export default function Home() {
  return <DiscAssessment />;
}
