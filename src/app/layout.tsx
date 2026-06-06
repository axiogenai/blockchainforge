import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ChainForge AI — AI Blockchain Generator",
  description: "Design, configure, and generate production-ready Cosmos SDK blockchains with an AI-powered step-by-step wizard.",
  keywords: ["blockchain", "generator", "cosmos sdk", "AI", "web3", "crypto"],
};

import { Blocks, BookOpen, GitBranch } from "lucide-react";
import Link from "next/link";
import SessionWrapper from "@/components/SessionWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <SessionWrapper>
          <div className="app-wrapper">
            {/* Global Navbar */}
            <nav className="top-nav">
              <div className="nav-container">
                <Link href="/" style={{ textDecoration: 'none' }}>
                  <div className="nav-logo">
                    <Blocks size={24} className="text-primary" />
                    <span className="nav-logo-text">ChainForge</span>
                  </div>
                </Link>
                <div className="nav-links">
                  <a href="#" className="nav-link"><BookOpen size={16} /> Docs</a>
                  <a href="#" className="nav-link"><GitBranch size={16} /> GitHub</a>
                  <Link href="/build" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Launch App</Link>
                </div>
              </div>
            </nav>

            {children}

            {/* Global Footer */}
            <footer className="footer">
              <div className="footer-content">
                <p>© {new Date().getFullYear()} axiogen.in. All rights reserved.</p>
                <p className="footer-built-with">
                  Built with <span className="heart">❤️</span> by Aditya
                </p>
              </div>
            </footer>
          </div>
        </SessionWrapper>
      </body>
    </html>
  );
}
