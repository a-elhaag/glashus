"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { components } from "@workspace/sdk"
import { useAuth } from "@/components/providers"
import { glashusApi } from "@/lib/api"

export type MeData = components["schemas"]["MeResponse"]
export type ExposureSummaryData = components["schemas"]["ExposureSummaryResponse"]
export type FolderData = components["schemas"]["Folder"]
export type FileData = components["schemas"]["FileRecord"]
export type FindingData = components["schemas"]["Finding"]
export type ShareData = components["schemas"]["ShareRecord"]
export type AuditEventData = components["schemas"]["AuditEvent"]
export type AiLogData = components["schemas"]["AiLogListResponse"]
export type CanaryListData = components["schemas"]["CanaryListResponse"]

export function unwrapApi<T>(res: {
  data?: T
  error?: { error?: { message?: string } }
  response: Response
}): T {
  if (res.data !== undefined) return res.data
  const message =
    res.error?.error?.message ?? `Request failed with HTTP ${res.response.status}`
  throw new Error(message)
}

export function useMe() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["me", user?.uid],
    enabled: Boolean(user),
    queryFn: async () => unwrapApi(await glashusApi.GET("/v1/me")),
  })
}

export function useExposure() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["exposure", user?.uid],
    enabled: Boolean(user),
    queryFn: async () => unwrapApi(await glashusApi.GET("/v1/exposure")),
  })
}

export function useFolders() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["folders", user?.uid],
    enabled: Boolean(user),
    queryFn: async () =>
      unwrapApi(await glashusApi.GET("/v1/folders")).folders,
  })
}

export function useFiles(options?: {
  folderId?: string
  trashed?: boolean
}) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["files", user?.uid, options?.folderId ?? "all", options?.trashed ?? false],
    enabled: Boolean(user),
    queryFn: async () =>
      unwrapApi(
        await glashusApi.GET("/v1/files", {
          params: {
            query: {
              ...(options?.folderId ? { folderId: options.folderId } : {}),
              trashed: options?.trashed ? "true" : "false",
            },
          },
        })
      ).files,
  })
}

export function useShares() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["shares", user?.uid],
    enabled: Boolean(user),
    queryFn: async () =>
      unwrapApi(await glashusApi.GET("/v1/shares")).shares,
  })
}

export function useAudit() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["audit", user?.uid],
    enabled: Boolean(user),
    queryFn: async () =>
      unwrapApi(await glashusApi.GET("/v1/audit")).events,
  })
}

export function useAiLog() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["ai-log", user?.uid],
    enabled: Boolean(user),
    queryFn: async () => unwrapApi(await glashusApi.GET("/v1/ai/log")),
  })
}

export function useCanaries() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["canaries", user?.uid],
    enabled: Boolean(user),
    queryFn: async () => unwrapApi(await glashusApi.GET("/v1/canaries")),
  })
}

export function useInvalidateDrive() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["me"] })
    void queryClient.invalidateQueries({ queryKey: ["exposure"] })
    void queryClient.invalidateQueries({ queryKey: ["folders"] })
    void queryClient.invalidateQueries({ queryKey: ["files"] })
    void queryClient.invalidateQueries({ queryKey: ["shares"] })
    void queryClient.invalidateQueries({ queryKey: ["audit"] })
    void queryClient.invalidateQueries({ queryKey: ["ai-log"] })
    void queryClient.invalidateQueries({ queryKey: ["canaries"] })
  }
}

function putFileWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url, true)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        onProgress?.(Math.min(99, Math.round((ev.loaded / ev.total) * 100)))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
      } else {
        reject(new Error(`Quarantine upload failed (HTTP ${xhr.status}).`))
      }
    }
    xhr.onerror = () => {
      reject(new Error("Network error uploading file to quarantine."))
    }
    xhr.send(file)
  })
}

export async function uploadFileToGlashus(
  file: File,
  folderId: string | null,
  callbacks?: {
    onStage?: (stage: "uploading" | "scanning") => void
    onProgress?: (percent: number) => void
  }
) {
  const contentType = file.type || "application/octet-stream"
  callbacks?.onStage?.("uploading")

  const { fileId, uploadUrl } = unwrapApi(
    await glashusApi.POST("/v1/files/upload-url", {
      body: {
        name: file.name,
        folderId,
        mime: contentType,
        size: Math.max(1, file.size),
      },
    })
  )

  await putFileWithProgress(uploadUrl, file, contentType, callbacks?.onProgress)
  callbacks?.onStage?.("scanning")

  return unwrapApi(
    await glashusApi.POST("/v1/files/{id}/complete-upload", {
      params: { path: { id: fileId } },
    })
  )
}
