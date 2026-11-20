"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/glashus"
import { useAuth } from "@/components/providers"

export default function AppAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const isPublicRecipient = pathname.startsWith("/sharing/recipient")

  React.useEffect(() => {
    if (!isPublicRecipient && !loading && !user) {
      router.replace("/auth")
    }
  }, [isPublicRecipient, loading, user, router])

  if (isPublicRecipient) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div
        className="plain"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="glass col center"
          style={{ borderRadius: 24, padding: "28px 36px", gap: 8 }}
        >
          <span className="h2">Opening your drive…</span>
          <span className="sm muted">Verifying Firebase session</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div
        className="plain"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          className="glass col center"
          style={{ borderRadius: 24, padding: "28px 36px", gap: 14 }}
        >
          <span className="h2">Sign in required</span>
          <span className="sm muted">
            Redirecting you to sign in to Glashus.
          </span>
          <Button label="Go to Sign in" variant="primary" href="/auth" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
