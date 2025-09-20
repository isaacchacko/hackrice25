// In src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rabbit Search",
  description: "An AI-powered search experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="bg-slate-900 min-h-screen text-slate-100">
          <main className="max-w-4xl mx-auto p-4">{children}</main>
        </div>
      </body>
    </html>
  );
}