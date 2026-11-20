import { createRoute } from "@hono/zod-openapi"
import { FieldValue } from "firebase-admin/firestore"
import { GoogleAuth } from "google-auth-library"
import { HTTPException } from "hono/http-exception"
import {
  AiLogListResponseSchema,
  AskFilesRequestSchema,
  AskFilesResponseSchema,
  AuditListResponseSchema,
  CanaryListResponseSchema,
  CanarySchema,
  CanaryTriggerSchema,
  CreateCanaryRequestSchema,
  ErrorResponseSchema,
  UpdateCanaryRequestSchema,
  z,
  type AiLogEntry,
  type AskCitation,
  type AuditEvent,
  type Canary,
  type CanaryTrigger,
} from "@workspace/schema"
import { assertOwnership, requireAuth, userCollection } from "../core/auth.js"
import { writeAuditEvent } from "../core/audit.js"
import { getAdminDb } from "../core/firebase.js"
import {
  isTextInspectable,
  maskAndRedactText,
  stripPromptInjection,
} from "../core/scanner.js"
import { toFileRecord, toFolder } from "../core/serializers.js"
import { readCleanSample } from "../core/storage.js"
import type { ApiApp } from "./me.js"

const IdParamSchema = z.object({
  id: z.string().min(1).openapi({ param: { name: "id", in: "path" } }),
})

const listAuditRoute = createRoute({
  method: "get",
  path: "/v1/audit",
  tags: ["Activity"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Audit events for the authenticated user",
      content: { "application/json": { schema: AuditListResponseSchema } },
    },
  },
})

const listAiLogRoute = createRoute({
  method: "get",
  path: "/v1/ai/log",
  tags: ["AI"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "AI access log entries for the authenticated user",
      content: { "application/json": { schema: AiLogListResponseSchema } },
    },
  },
})

const listCanariesRoute = createRoute({
  method: "get",
  path: "/v1/canaries",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: "Canary bait files and trigger history",
      content: { "application/json": { schema: CanaryListResponseSchema } },
    },
  },
})

const createCanaryRoute = createRoute({
  method: "post",
  path: "/v1/canaries",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateCanaryRequestSchema } },
    },
  },
  responses: {
    201: {
      description: "Canary created",
      content: { "application/json": { schema: CanarySchema } },
    },
  },
})

const updateCanaryRoute = createRoute({
  method: "patch",
  path: "/v1/canaries/{id}",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    params: IdParamSchema,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateCanaryRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Canary updated",
      content: { "application/json": { schema: CanarySchema } },
    },
  },
})

const testCanaryRoute = createRoute({
  method: "post",
  path: "/v1/canaries/{id}/test",
  tags: ["Security"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: { params: IdParamSchema },
  responses: {
    200: {
      description: "Simulated test trigger logged",
      content: { "application/json": { schema: CanaryTriggerSchema } },
    },
    400: {
      description: "Canary is paused",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
})

const askFilesRoute = createRoute({
  method: "post",
  path: "/v1/ai/ask",
  tags: ["AI"],
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: AskFilesRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Consent-gated grounded response across consented Drive files",
      content: { "application/json": { schema: AskFilesResponseSchema } },
    },
  },
})

function toCanary(id: string, data: FirebaseFirestore.DocumentData): Canary {
  const now = new Date().toISOString()
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    fileId: String(data.fileId ?? id),
    name: String(data.name ?? "canary-file"),
    folderId: typeof data.folderId === "string" ? data.folderId : null,
    folderName: String(data.folderName ?? "Drive"),
    status:
      data.status === "triggered" || data.status === "paused"
        ? data.status
        : "armed",
    channel:
      data.channel === "email" || data.channel === "push"
        ? data.channel
        : "both",
    detail: String(data.detail ?? "Never opened. Checked every request."),
    lastTriggeredAt:
      typeof data.lastTriggeredAt === "string" ? data.lastTriggeredAt : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
  }
}

async function askVertexGemini(
  question: string,
  contexts: Array<{ fileName: string; text: string }>
): Promise<string | null> {
  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId || contexts.length === 0) return null

  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    })
    const client = await auth.getClient()
    const tokenRes = await client.getAccessToken()
    const token = tokenRes?.token
    if (!token) return null

    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`
    const promptContext = contexts
      .map(
        (ctx, idx) =>
          `[${idx + 1}] File: ${ctx.fileName}\n${ctx.text.slice(0, 3500)}`
      )
      .join("\n\n")

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Answer the user's question concisely using only the redacted file excerpts below. Cite sources using [1], [2], etc.\n\nQuestion: ${question}\n\n${promptContext}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 400,
        },
      }),
    })

    if (!response.ok) return null
    const json = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
      }>
    }
    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? ""
    return text || null
  } catch {
    return null
  }
}

export function registerAiRoutes(app: ApiApp): void {
  app.openapi(listAuditRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const snap = await db.collection("audit").doc(uid).collection("events").get()
    const events: AuditEvent[] = snap.docs
      .map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          action: String(d.action ?? "event"),
          category:
            d.category === "sharing" ||
            d.category === "ai" ||
            d.category === "security"
              ? (d.category as "sharing" | "ai" | "security")
              : ("files" as const),
          title: String(d.title ?? d.action ?? "Activity"),
          detail: String(d.detail ?? ""),
          target: String(d.target ?? ""),
          actor: String(d.actor ?? uid),
          device: typeof d.device === "string" ? d.device : null,
          ip: typeof d.ip === "string" ? d.ip : null,
          time: String(d.time ?? new Date().toISOString()),
        }
      })
      .sort((a, b) => b.time.localeCompare(a.time))

    return c.json({ events }, 200)
  })

  app.openapi(listAiLogRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const snap = await db.collection("aiLog").doc(uid).collection("reads").get()
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const reads: AiLogEntry[] = snap.docs
      .map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          fileId: String(d.fileId ?? ""),
          fileName: String(d.fileName ?? "file"),
          folderName: String(d.folderName ?? "Drive"),
          consentMode: String(d.consentMode ?? "ask"),
          purpose: String(d.purpose ?? "ask_my_files"),
          sentSummary: String(d.sentSummary ?? ""),
          maskedCount: typeof d.maskedCount === "number" ? d.maskedCount : 0,
          model: String(d.model ?? "gemini-2.5-flash"),
          time: String(d.time ?? new Date().toISOString()),
        }
      })
      .sort((a, b) => b.time.localeCompare(a.time))

    const weeklyReads = reads.filter(
      (r) => new Date(r.time).getTime() >= weekAgo
    ).length
    const totalMasked = reads.reduce((acc, r) => acc + r.maskedCount, 0)

    return c.json({ reads, weeklyReads, totalMasked }, 200)
  })

  app.openapi(listCanariesRoute, async (c) => {
    const uid = c.get("uid")
    const db = getAdminDb()
    const [canSnap, histSnap] = await Promise.all([
      db.collection("canaries").where("ownerUid", "==", uid).get(),
      db.collection("canaryHistory").doc(uid).collection("triggers").get(),
    ])

    const canaries = canSnap.docs
      .map((d) => toCanary(d.id, d.data()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const history: CanaryTrigger[] = histSnap.docs
      .map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          canaryId: String(d.canaryId ?? ""),
          canaryName: String(d.canaryName ?? "canary"),
          when: String(d.when ?? new Date().toISOString()),
          source: String(d.source ?? "Test check"),
          result:
            d.result === "alert_sent"
              ? ("alert_sent" as const)
              : ("ignored" as const),
        }
      })
      .sort((a, b) => b.when.localeCompare(a.when))

    return c.json({ canaries, history }, 200)
  })

  app.openapi(createCanaryRoute, async (c) => {
    const uid = c.get("uid")
    const body = c.req.valid("json")
    const db = getAdminDb()

    let folderName = "Drive"
    if (body.folderId) {
      const fSnap = await userCollection(db, uid, "folders")
        .doc(body.folderId)
        .get()
      if (fSnap.exists && fSnap.data()?.name) {
        folderName = String(fSnap.data()!.name)
      }
    }

    const now = new Date().toISOString()
    const ref = db.collection("canaries").doc()
    const record = {
      ownerUid: uid,
      fileId: ref.id,
      name: body.name,
      folderId: body.folderId,
      folderName,
      status: "armed" as const,
      channel: body.channel,
      detail: "Never opened. Checked every request.",
      lastTriggeredAt: null,
      createdAt: now,
    }
    await ref.set(record)
    await writeAuditEvent(db, uid, {
      action: "canary.create",
      category: "security",
      title: `Armed canary ${body.name}`,
      detail: `Folder: ${folderName} · Channel: ${body.channel}`,
      target: ref.id,
    })

    return c.json(toCanary(ref.id, record), 201)
  })

  app.openapi(updateCanaryRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const body = c.req.valid("json")
    const db = getAdminDb()

    const ref = db.collection("canaries").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Canary not found." })
    }
    assertOwnership(String(snap.data()!.ownerUid ?? ""), uid)

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) {
      updates.status = body.status
      updates.detail =
        body.status === "armed"
          ? "Armed. Checked every request."
          : "Paused. Opens will not alert until armed."
    }
    if (body.channel !== undefined) updates.channel = body.channel

    await ref.set(updates, { merge: true })
    const updated = await ref.get()
    return c.json(toCanary(id, updated.data()!), 200)
  })

  app.openapi(testCanaryRoute, async (c) => {
    const uid = c.get("uid")
    const { id } = c.req.valid("param")
    const db = getAdminDb()

    const ref = db.collection("canaries").doc(id)
    const snap = await ref.get()
    if (!snap.exists || !snap.data()) {
      throw new HTTPException(404, { message: "Canary not found." })
    }
    const canary = toCanary(id, snap.data()!)
    assertOwnership(canary.ownerUid, uid)

    if (canary.status === "paused") {
      throw new HTTPException(400, {
        message: "Canary is paused. Arm it before testing triggers.",
      })
    }

    const now = new Date().toISOString()
    const triggerRef = db
      .collection("canaryHistory")
      .doc(uid)
      .collection("triggers")
      .doc()
    const trigger = {
      canaryId: canary.id,
      canaryName: canary.name,
      when: now,
      source: `Your own account · test (${canary.channel})`,
      result: "ignored" as const,
    }
    await triggerRef.set(trigger)
    await ref.set({ lastTriggeredAt: now }, { merge: true })
    await writeAuditEvent(db, uid, {
      action: "canary.test",
      category: "security",
      title: `Tested canary ${canary.name}`,
      detail: `Simulated trigger (${canary.channel})`,
      target: canary.id,
    })

    return c.json({ id: triggerRef.id, ...trigger }, 200)
  })

  app.openapi(askFilesRoute, async (c) => {
    const uid = c.get("uid")
    const { question, folderId } = c.req.valid("json")
    const db = getAdminDb()

    const [userSnap, foldersSnap, filesSnap] = await Promise.all([
      db.collection("users").doc(uid).get(),
      userCollection(db, uid, "folders").get(),
      userCollection(db, uid, "files").get(),
    ])

    const rawMode = userSnap.data()?.aiMode
    const aiMode =
      rawMode === "allow" ? "allow" : rawMode === "ask" ? "ask" : "off"

    if (aiMode === "off") {
      return c.json(
        {
          answer: "",
          citations: [],
          maskedCount: 0,
          ignoredCount: 0,
          consentBlocked: true,
          consentMessage:
            "AI access is turned off for your account. Enable Ask or Allow in Settings.",
        },
        200
      )
    }

    const folders = foldersSnap.docs.map((d) => toFolder(d.id, d.data()))
    const folderMap = new Map(folders.map((f) => [f.id, f]))

    if (folderId) {
      const targetFolder = folderMap.get(folderId)
      if (targetFolder?.vault) {
        return c.json(
          {
            answer: "",
            citations: [],
            maskedCount: 0,
            ignoredCount: 0,
            consentBlocked: true,
            consentMessage:
              "Vault folders are encrypted in your browser and never read by AI.",
          },
          200
        )
      }
      if (targetFolder && targetFolder.aiConsent === "off") {
        return c.json(
          {
            answer: "",
            citations: [],
            maskedCount: 0,
            ignoredCount: 0,
            consentBlocked: true,
            consentMessage: `AI consent for "${targetFolder.name}" is off. Change it in Settings.`,
          },
          200
        )
      }
    }

    const candidateFiles = filesSnap.docs
      .map((d) => toFileRecord(d.id, d.data()))
      .filter((f) => {
        if (f.trashedAt !== null || f.scanStatus !== "clean") return false
        if (folderId && f.folderId !== folderId) return false
        if (f.folderId) {
          const folder = folderMap.get(f.folderId)
          if (!folder || folder.vault || folder.aiConsent === "off") {
            return false
          }
        }
        return isTextInspectable(f.name, f.mime)
      })
      .slice(0, 6)

    if (candidateFiles.length === 0) {
      return c.json(
        {
          answer:
            "No consented text-readable files matched this scope yet. Upload a text, markdown, CSV, or JSON file in a consented folder first.",
          citations: [],
          maskedCount: 0,
          ignoredCount: 0,
          consentBlocked: false,
          consentMessage: null,
        },
        200
      )
    }

    const contexts: Array<{ fileId: string; fileName: string; text: string }> = []
    const citations: AskCitation[] = []
    let totalMasked = 0
    let totalIgnored = 0
    const now = new Date().toISOString()
    const month = now.slice(0, 7)

    for (const file of candidateFiles) {
      try {
        const { sample } = await readCleanSample(uid, file.id, 32 * 1024)
        const rawText = sample.toString("utf8")
        const { cleanText, strippedCount } = stripPromptInjection(rawText)
        const { redactedText, maskedCount } = maskAndRedactText(cleanText)

        totalMasked += maskedCount
        totalIgnored += strippedCount

        const folder = file.folderId ? folderMap.get(file.folderId) : null
        const folderName = folder?.name ?? "Drive"
        const consentMode = folder?.aiConsent ?? aiMode

        await db.collection("aiLog").doc(uid).collection("reads").add({
          fileId: file.id,
          fileName: file.name,
          folderName,
          consentMode,
          purpose: "Ask files",
          sentSummary: `${Math.min(redactedText.length, 3500)} chars · ${maskedCount} value(s) masked`,
          maskedCount,
          model: "gemini-2.5-flash",
          time: now,
        })

        await writeAuditEvent(db, uid, {
          action: "ai.read",
          category: "ai",
          title: `AI read ${file.name}`,
          detail: `Ask my files · ${maskedCount} value(s) masked`,
          target: file.id,
        })

        contexts.push({ fileId: file.id, fileName: file.name, text: redactedText })

        const snippet =
          redactedText
            .split(/\r?\n/)
            .find((line) => line.trim().length > 0)
            ?.slice(0, 140) ?? "Clean redacted excerpt"

        citations.push({
          fileId: file.id,
          fileName: file.name,
          detail: `${folderName} · ${maskedCount} masked`,
          excerpt: snippet,
        })
      } catch {
        // Skip unreadable object safely
      }
    }

    if (contexts.length > 0) {
      await db
        .collection("usage")
        .doc(uid)
        .collection("months")
        .doc(month)
        .set({ aiReads: FieldValue.increment(contexts.length) }, { merge: true })
    }

    const geminiAnswer = await askVertexGemini(
      question,
      contexts.map((ctx) => ({ fileName: ctx.fileName, text: ctx.text }))
    )

    const fallbackAnswer =
      contexts.length === 0
        ? "Could not read any consented files for this question."
        : `Checked ${contexts.length} consented file(s) with ${totalMasked} sensitive value(s) masked: ${contexts
            .map((ctx, i) => `[${i + 1}] ${ctx.fileName}: "${ctx.text.slice(0, 180).replace(/\s+/g, " ").trim()}"`)
            .join(" · ")}`

    return c.json(
      {
        answer: geminiAnswer ?? fallbackAnswer,
        citations,
        maskedCount: totalMasked,
        ignoredCount: totalIgnored,
        consentBlocked: false,
        consentMessage: null,
      },
      200
    )
  })
}
