import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MusicQueue - Collaborative Music Rooms",
  description: "Create collaborative music rooms where everyone can add songs and vote for their favorites",
  keywords: ["music", "collaborative", "playlist", "voting", "spotify", "queue"],
  authors: [{ name: "MusicQueue" }],
  openGraph: {
    title: "MusicQueue - Collaborative Music Rooms",
    description: "Create collaborative music rooms where everyone can add songs and vote for their favorites",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
