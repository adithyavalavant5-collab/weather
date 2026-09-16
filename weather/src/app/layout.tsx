import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Driven Hyper-Local Early Warning System | Severe Weather Nowcasting India",
  description:
    "AI-powered 0-6 hour hyper-local nowcasting + live location + live time + live weather synchronization + hour-by-hour risk prediction + multi-channel last-mile alerts for India.",
  keywords: [
    "AI nowcasting", "severe weather", "hyper-local", "early warning",
    "India weather", "disaster management", "SIH", "Smart India Hackathon",
    "ConvLSTM", "U-Net", "GIS map", "SMS IVR siren alerts",
  ],
  authors: [{ name: "SIH Prototype Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AI-Driven Hyper-Local Early Warning System",
    description: "Predict Earlier. Warn Locally. Act Faster. Save Lives.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
