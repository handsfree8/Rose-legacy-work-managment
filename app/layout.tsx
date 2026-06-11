import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rose Legacy Management",
  description: "Property and work-order management for Rose Legacy Home Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "var(--purple)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "15px",
                }}
              >
                RL
              </span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "16px" }}>
                  Rose Legacy
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  Work Management
                </span>
              </span>
            </a>

            <nav style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <a
                href="/"
                style={{
                  textDecoration: "none",
                  color: "var(--text)",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Properties
              </a>
              {process.env.NEXT_PUBLIC_INVOICE_APP_URL && (
                <a
                  href={process.env.NEXT_PUBLIC_INVOICE_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "none",
                    background: "var(--purple-soft)",
                    color: "var(--purple)",
                    fontWeight: 700,
                    fontSize: "14px",
                    padding: "8px 14px",
                    borderRadius: "999px",
                  }}
                >
                  Invoices ↗
                </a>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
