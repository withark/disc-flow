import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
const description = "24개의 선택으로 나의 행동 경향을 파악하고 팀의 DISC 분포를 확인하는 진단 도구입니다.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "DISC 행동유형 진단 | DISC FLOW",
  description,
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "DISC 행동유형 진단 | DISC FLOW",
    description,
    type: "website",
    images: [{ url: new URL("/og.png", siteUrl).toString(), width: 1731, height: 909, alt: "DISC FLOW 행동유형 진단" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DISC 행동유형 진단 | DISC FLOW",
    description,
    images: [new URL("/og.png", siteUrl).toString()],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
