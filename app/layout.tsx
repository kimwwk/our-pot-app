import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { SQLiteProvider } from "@/lib/data/contexts/SQLiteContext";
import { AccountProvider } from "@/lib/data/contexts/AccountContext";
import { ChangeSetProvider } from "@/lib/data/contexts/ChangeSetContext";
import { Toaster } from "@/components/ui/sonner";
import "@/lib/utils/debug-logger"; // Initialize debug logger

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OurPot",
  description: "Expense tracking with AI agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SQLiteProvider>
            <AccountProvider>
              <ChangeSetProvider>
                {children}
              </ChangeSetProvider>
            </AccountProvider>
            <Toaster />
          </SQLiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
