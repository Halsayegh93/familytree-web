import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "عائلة المحمدعلي — شجرة العائلة",
  description: "تطبيق شجرة العائلة الرسمي لعائلة آل محمد علي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </body>
    </html>
  );
}
