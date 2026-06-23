import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "agentfolio",
  description: "Shared agent ↔ client property board",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
