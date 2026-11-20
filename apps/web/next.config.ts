import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/schema", "@workspace/sdk"],
}

export default nextConfig
