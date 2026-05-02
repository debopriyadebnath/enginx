import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Condiment } from "next/font/google"; // Import custom fonts
import { Toaster } from "sonner";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import { getConvexUrlFromEnvLocalFile } from "@/lib/readConvexUrl.server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
});

const condiment = Condiment({
  weight: "400",
  variable: "--font-condiment-google",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EngineX",
  description: "EngineX hackathon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const convexUrl = getConvexUrlFromEnvLocalFile();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${condiment.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider convexUrl={convexUrl}>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "#0d1a3a",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e8eeff",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: "13px",
                borderRadius: "14px",
              },
            }}
          />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
