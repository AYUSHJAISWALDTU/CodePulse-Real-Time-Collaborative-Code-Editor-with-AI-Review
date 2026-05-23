import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodePulse — Collaborative Code Editor with AI Review",
  description:
    "A real-time collaborative code editor where teams edit code together, receive AI-powered code reviews, and maintain persistent version history.",
  keywords: [
    "code editor",
    "collaborative coding",
    "AI code review",
    "real-time",
    "pair programming",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
