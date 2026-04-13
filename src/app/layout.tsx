import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLOCK6 Time Manager",
  description: "6區塊黃金比例時間分配法",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
