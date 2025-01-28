import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RootWrapper } from "@/app/components/common/root-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Goldilocks",
  description: "AI Agent Framework",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RootWrapper>
          {children}
        </RootWrapper>
      </body>
    </html>
  );
}
