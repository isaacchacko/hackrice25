// In src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
<<<<<<< HEAD
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import KeyboardHandler from "@/components/KeyboardHandler";
=======
>>>>>>> 49f9c42 (graph toggling)

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
      <body className={inter.className} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
