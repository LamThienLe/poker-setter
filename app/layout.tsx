import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GroupProvider } from "@/lib/groups";

export const metadata: Metadata = {
  title: "Poker Settler",
  description: "Settle up after poker night",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <GroupProvider>{children}</GroupProvider>
      </body>
    </html>
  );
}
