import type { Metadata } from "next";
import localFont from "next/font/local";
import { Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Pao e Mar — PDV",
  description: "Punto de venta para panadería boutique",
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
          colorPrimary: "#c9962e",
          colorBackground: "#fffdf9",
          colorText: "#2a1b12",
          colorTextSecondary: "#7a6a56",
          colorInputBackground: "#fffdf9",
          colorInputText: "#2a1b12",
          colorNeutral: "#2a1b12",
          borderRadius: "0.625rem",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      <html lang="es">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased`}
        >
          <AppHeader />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
