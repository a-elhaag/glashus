import type { CollectionReference, DocumentData, Firestore } from "firebase-admin/firestore"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { getAdminAuth } from "./firebase.js"

export type AuthVariables = {
  uid: string
  email: string | null
  name: string | null
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authHeader = c.req.header("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or malformed Authorization Bearer token.",
          },
        },
        401
      )
    }

    const token = authHeader.slice("Bearer ".length).trim()
    if (!token) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Empty Authorization Bearer token.",
          },
        },
        401
      )
    }

    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      c.set("uid", decoded.uid)
      c.set("email", decoded.email ?? null)
      c.set("name", typeof decoded.name === "string" ? decoded.name : null)
      await next()
    } catch {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired Firebase ID token.",
          },
        },
        401
      )
    }
  }
)

/**
 * Throws 403 if a document or share record is owned by a different user.
 */
export function assertOwnership(resourceOwnerUid: string, currentUid: string): void {
  if (resourceOwnerUid !== currentUid) {
    throw new HTTPException(403, {
      message: "Forbidden: you do not own this resource.",
    })
  }
}

export type UserSubcollection = "folders" | "files" | "chunks"

export function userCollection(
  db: Firestore,
  uid: string,
  subcollection: UserSubcollection
): CollectionReference<DocumentData> {
  return db.collection("users").doc(uid).collection(subcollection)
}
