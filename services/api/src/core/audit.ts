import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import type { Firestore } from "firebase-admin/firestore"
import { HTTPException } from "hono/http-exception"
import { FREE_MONTHLY_DOWNLOAD_CAP_BYTES } from "@workspace/schema"

export type AuditCategory = "files" | "sharing" | "ai" | "security"

export async function writeAuditEvent(
  db: Firestore,
  uid: string,
  event: {
    action: string
    category: AuditCategory
    title: string
    detail: string
    target: string
    actor?: string
    device?: string | null
    ip?: string | null
  }
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .collection("audit")
    .doc(uid)
    .collection("events")
    .add({
      action: event.action,
      category: event.category,
      title: event.title,
      detail: event.detail,
      target: event.target,
      actor: event.actor ?? uid,
      device: event.device ?? null,
      ip: event.ip ?? null,
      time: now,
    })
}

export async function incrementMonthlyDownloadBytes(
  db: Firestore,
  ownerUid: string,
  bytes: number
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7)
  const ref = db.collection("usage").doc(ownerUid).collection("months").doc(month)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data()
    const currentBytes =
      typeof data?.downloadBytes === "number" ? data.downloadBytes : 0
    const nextBytes = currentBytes + Math.max(0, bytes)
    if (nextBytes > FREE_MONTHLY_DOWNLOAD_CAP_BYTES) {
      throw new HTTPException(429, {
        message: "Monthly 10 GB download cap reached for this account.",
      })
    }
    tx.set(
      ref,
      {
        downloadBytes: nextBytes,
        aiReads: typeof data?.aiReads === "number" ? data.aiReads : 0,
      },
      { merge: true }
    )
  })
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex")
  const derived = scryptSync(pin, salt, 32).toString("hex")
  return `${salt}:${derived}`
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":")
  if (!salt || !expectedHex) return false
  const actualBuf = scryptSync(pin, salt, 32)
  const expectedBuf = Buffer.from(expectedHex, "hex")
  if (actualBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(actualBuf, expectedBuf)
}
