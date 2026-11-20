"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth"
import { Field, Icon, resolveBoardHref } from "@workspace/ui/components/glashus"
import { useAuth } from "@/components/providers"
import { glashusApi } from "@/lib/api"
import {
  getFirebaseAuth,
  googleProvider,
  isFirebaseConfigured,
} from "@/lib/firebase"

function mapAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : ""
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Incorrect email or password."
  }
  if (code === "auth/user-not-found") {
    return "No account found with that email address."
  }
  if (code === "auth/email-already-in-use") {
    return "An account already exists for that email. Try signing in instead."
  }
  if (code === "auth/weak-password") {
    return "Please choose a password with at least 8 characters."
  }
  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in popup was closed before completing."
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized in Firebase Auth settings."
  }
  return err instanceof Error ? err.message : "Authentication failed."
}

export default function AuthPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isSignUp, setIsSignUp] = React.useState(false)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!authLoading && user && !busy) {
      router.replace("/drive")
    }
  }, [authLoading, user, busy, router])

  const title = isSignUp ? "Create your drive" : "Welcome back"
  const sub = isSignUp
    ? "Free for 10 GB. No card needed."
    : "Sign in to see who can see your files."
  const cta = isSignUp ? "Create account" : "Sign in"
  const swapText = isSignUp ? "Already have an account?" : "New to Glashus?"
  const swapCta = isSignUp ? "Sign in" : "Create account"

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
      setError("Firebase environment variables are missing.")
      return
    }
    setError(null)
    setInfoMsg(null)
    setBusy(true)
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), googleProvider)
      const isNew = Boolean(getAdditionalUserInfo(cred)?.isNewUser)
      await glashusApi.GET("/v1/me")
      router.push(isNew ? "/onboarding" : "/drive")
    } catch (err) {
      setError(mapAuthError(err))
      setBusy(false)
    }
  }

  const handleForgotPassword = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setError("Enter your email address above first to reset your password.")
      return
    }
    setError(null)
    setInfoMsg(null)
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), trimmed)
      setInfoMsg(`Password reset email sent to ${trimmed}.`)
    } catch (err) {
      setError(mapAuthError(err))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFirebaseConfigured) {
      setError("Firebase environment variables are missing.")
      return
    }
    setError(null)
    setInfoMsg(null)
    setBusy(true)
    try {
      const auth = getFirebaseAuth()
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        )
        const cleanName = name.trim()
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName })
        }
        await glashusApi.GET("/v1/me")
        if (cleanName) {
          await glashusApi.PATCH("/v1/me", { body: { name: cleanName } })
        }
        router.push("/onboarding")
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
        await glashusApi.GET("/v1/me")
        router.push("/drive")
      }
    } catch (err) {
      setError(mapAuthError(err))
      setBusy(false)
    }
  }

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
        className="glass col"
        style={{
          width: 440,
          maxWidth: "100%",
          borderRadius: 28,
          padding: 36,
          gap: 22,
        }}
      >
        <Link
          href={resolveBoardHref("Landing.dc.html")}
          className="row"
          style={{ gap: 10, alignSelf: "flex-start" }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background:
                "linear-gradient(145deg, #fff, rgba(255,255,255,0.35))",
              border: "1px solid rgba(17,17,17,0.12)",
              position: "relative",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                position: "absolute",
                right: 4,
                bottom: 4,
                width: 7,
                height: 7,
                borderRadius: 7,
                background: "var(--accent)",
              }}
            />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Glashus</span>
        </Link>

        <div className="col" style={{ gap: 6 }}>
          <h1 className="h1">{title}</h1>
          <p className="p muted" style={{ margin: 0 }}>
            {sub}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-lg btn-secondary"
          style={{ width: "100%" }}
          disabled={busy}
          onClick={() => void handleGoogleSignIn()}
        >
          <Icon glyph="globe" size={18} />
          Continue with Google
        </button>

        <div className="row xs muted" style={{ gap: 12 }}>
          <hr className="hr grow" />
          <span>or</span>
          <hr className="hr grow" />
        </div>

        {error ? (
          <div
            role="alert"
            className="glass-soft row"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              gap: 8,
              border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
            }}
          >
            <Icon glyph="warn" size={16} />
            <span className="xs m" style={{ color: "var(--accent)" }}>
              {error}
            </span>
          </div>
        ) : null}

        {infoMsg ? (
          <div
            role="status"
            className="glass-soft row"
            style={{ padding: "10px 12px", borderRadius: 12, gap: 8 }}
          >
            <Icon glyph="check" size={16} />
            <span className="xs m">{infoMsg}</span>
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} className="col" style={{ gap: 16 }}>
          {isSignUp ? (
            <Field
              id="full-name"
              name="full-name"
              label="Name"
              placeholder="Anas Abuelhaag"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : null}

          <Field
            id="email"
            name="email"
            label="Email"
            placeholder="you@example.com"
            type="email"
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="next"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="col" style={{ gap: 6 }}>
            <div className="row between">
              <label htmlFor="password" className="xs b">
                Password
              </label>
              <div className="row" style={{ gap: 8 }}>
                {!isSignUp ? (
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    className="xs muted"
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="xs m"
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "var(--accent)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <input
              id="password"
              name="password"
              className="input"
              placeholder="At least 8 characters"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              enterKeyHint="done"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="xs muted">Use a long phrase. We never see it.</span>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn btn-lg btn-primary"
            style={{ width: "100%", marginTop: 4 }}
          >
            {busy ? "Signing in…" : cta}
          </button>
        </form>

        <p className="sm muted center" style={{ margin: 0 }}>
          {swapText}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp((prev) => !prev)
              setError(null)
              setInfoMsg(null)
            }}
            className="m"
            style={{
              border: 0,
              background: "transparent",
              color: "var(--accent)",
              fontSize: 13,
              cursor: "pointer",
              padding: 4,
            }}
          >
            {swapCta}
          </button>
        </p>

        <p className="xs muted center" style={{ margin: 0 }}>
          By continuing you agree to the{" "}
          <Link
            href={resolveBoardHref("Terms.dc.html")}
            style={{ textDecoration: "underline" }}
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href={resolveBoardHref("Privacy.dc.html")}
            style={{ textDecoration: "underline" }}
          >
            Privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
