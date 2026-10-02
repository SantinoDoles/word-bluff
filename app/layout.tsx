import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word Bluff",
  description: "Invent definitions, spot the truth, and fool your friends. A live party game for 2–8 players.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}


