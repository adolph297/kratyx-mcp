import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kratyx Connect — Universal MCP Connector Platform",
  description: "Scalable, production-grade platform for managing 100+ API connectors with OAuth 2.0, API key support, and a universal execution engine.",
  keywords: ["MCP", "connectors", "API", "OAuth", "integration", "automation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="page-container">
          {children}
        </div>
      </body>
    </html>
  );
}
