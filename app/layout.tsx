import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/dashboard/Navbar";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "56 Thrif Shop",
  description: "Shoping Brand Second Ori",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Load script Midtrans Sandbox */}
        <Script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="beforeInteractive" />
      </head>
      <body>
        <Navbar />
        {children}
        <Toaster position="top-right" theme="light" richColors duration={3000} />
      </body>
    </html>
  );
}
