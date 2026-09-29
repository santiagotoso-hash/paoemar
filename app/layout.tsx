import type { Metadata } from "next";
import localFont from "next/font/local";
import { Figtree, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app-header";
import { WaveBackground } from "@/components/wave-background";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pao e Mar — PDV",
  description: "Ponto de venda para padaria boutique",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#a94e1b",
          colorBackground: "#fffcf7",
          colorText: "#2a1e16",
          colorTextSecondary: "#6e5a4b",
          colorInputBackground: "#fffcf7",
          colorInputText: "#2a1e16",
          colorNeutral: "#2a1e16",
          borderRadius: "0.875rem",
          fontFamily: "var(--font-body)",
        },
      }}
    >
      <html lang="pt-BR">
        <body
          className={`${figtree.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}
        >
          <WaveBackground />
          <AppHeader />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
