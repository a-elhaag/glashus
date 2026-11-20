import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"

const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Glashus — Exposure-Aware Cloud Drive",
  description: "Drive shows you your files. Glashus shows who can see them.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontInter.variable} ${fontMono.variable} font-sans antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
