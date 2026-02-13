import type { Metadata } from "next";
import { Outfit, Sora } from "next/font/google"; // Unique typography choices
import "./globals.css";

// Headings
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});

// Body text
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Veridian | Nature's Intelligence",
  description: "A pollution prediction and mitigation platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${sora.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
