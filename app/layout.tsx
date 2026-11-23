import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookmarks",
  description:
    "Save your useful links in one place.",
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
