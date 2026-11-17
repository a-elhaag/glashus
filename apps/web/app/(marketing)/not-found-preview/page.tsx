import type { Metadata } from "next"
import { NotFoundScreen } from "@/components/not-found-screen"

export const metadata: Metadata = {
  title: "Glashus — Page not found",
}

export default function NotFoundPreviewPage() {
  return <NotFoundScreen />
}
