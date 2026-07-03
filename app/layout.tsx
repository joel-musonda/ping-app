import type { Metadata } from "next";
import Navbar from "@/components/Navbar"; // Standard import mapping to your existing Navbar.tsx
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers"; // Used to read the current URL server-side
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ping",
  description: "Bold Ideas change the world. Share yours with Ping.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the current URL path safely on the server side to keep metadata working perfectly
  const headerList = await headers();
  const activePathname = headerList.get("x-url") || "";

  // Check if the user is visiting the login or signup page
  const isAuthPage = activePathname.includes("/login") || activePathname.includes("/signup");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">
        {/* Only show your Navbar if the user is NOT on an authentication page */}
        {!isAuthPage && <Navbar />}
        {children}
      </body>
    </html>
  );
}