import { BotIdClient } from "botid/client";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import "./globals.css";

const protectedRoutes = [
  { path: "/api/chat", method: "POST" },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-sdk-preview-rag.vercel.app"),
  title: "Retrieval Augmented Generation Preview",
  description:
    "Augment language model generations with vector based retrieval using the Vercel AI SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <BotIdClient protect={protectedRoutes} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
