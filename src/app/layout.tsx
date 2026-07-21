import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthHeader } from "@/components/AuthHeader";
import { CryptoPolyfill } from "@/components/CryptoPolyfill";
import { RevenueCatInit } from "@/components/RevenueCatInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kindred AI",
  description: "A personalized AI journaling companion",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kindred AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-zinc-950 text-slate-50`}
    >
        <body className="flex min-h-full flex-col bg-zinc-950 text-slate-50">
        <ClerkProvider
          appearance={{ theme: dark }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <CryptoPolyfill />
          <RevenueCatInit />
          <AuthHeader />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
