"use client"

import { useRouter } from "next/navigation"
import { Sidebar } from "@workspace/ui/components/glashus"
import { useAuth } from "@/components/providers"
import { formatBytes } from "@/lib/format"
import { useMe, useShares } from "@/lib/queries"

export function AppSidebar({ active }: { active: string }) {
  const router = useRouter()
  const { user, signOutUser } = useAuth()
  const meQuery = useMe()
  const sharesQuery = useShares()

  const bytesUsed = meQuery.data?.user.bytesUsed ?? 0
  const quotaBytes =
    meQuery.data?.user.storageQuotaBytes ?? 10 * 1024 * 1024 * 1024
  const storagePercent =
    quotaBytes > 0 ? Math.min(100, Math.round((bytesUsed / quotaBytes) * 100)) : 0
  const storageText = `${formatBytes(bytesUsed)} of ${formatBytes(quotaBytes)}`
  const sharedCount = sharesQuery.data?.length ?? 0

  return (
    <Sidebar
      active={active}
      storageText={storageText}
      storagePercent={storagePercent}
      sharedCount={sharedCount}
      userEmail={meQuery.data?.user.email || user?.email || null}
      onSignOut={async () => {
        await signOutUser()
        router.replace("/auth")
      }}
    />
  )
}
