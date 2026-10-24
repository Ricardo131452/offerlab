import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OfferLab｜简历 × JD 证据级匹配",
  description:
    "把简历和岗位 JD 逐条对照，按证据强度打分：哪些技能真的被证明了，哪些只是列了个名字。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
