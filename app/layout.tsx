import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Retrieval Augmented Generation Preview",
  description:
    "Augment language model generations with vector based retrieval using Vercel AI SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
