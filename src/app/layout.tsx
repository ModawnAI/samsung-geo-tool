import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Samsung GEO Tool",
  description: "GEO/AEO Optimization Tool for Samsung GMC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-samsung antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
