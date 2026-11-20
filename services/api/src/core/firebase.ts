import { getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let cachedApp: App | null = null

export function getAdminApp(): App {
  if (cachedApp) return cachedApp

  const existing = getApps()[0]
  if (existing) {
    cachedApp = existing
    return cachedApp
  }

  const projectId = process.env.GCP_PROJECT_ID
  cachedApp = projectId ? initializeApp({ projectId }) : initializeApp()
  return cachedApp
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp())
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp())
}
