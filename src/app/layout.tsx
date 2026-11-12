import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LeadPilot AI", template: "%s | LeadPilot AI" },
  description: "İşletmeniz için yapay zekâ destekli müşteri ve takip yönetimi.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
