import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    <html lang="ko" suppressHydrationWarning>
      <body className="font-samsung antialiased bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
