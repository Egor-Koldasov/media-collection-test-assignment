import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebGL and Three.js Demo Library",
  description: "A sparse practice library for raw WebGL2 and Three.js demos."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
