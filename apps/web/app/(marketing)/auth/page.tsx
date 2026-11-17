"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Field, Icon, resolveBoardHref } from "@workspace/ui/components/glashus"

export default function AuthPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = React.useState(false)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const title = isSignUp ? "Create your drive" : "Welcome back"
  const sub = isSignUp
    ? "Free for 15 GB. No card needed."
    : "Sign in to see who can see your files."
  const cta = isSignUp ? "Create account" : "Sign in"
  const swapText = isSignUp ? "Already have an account?" : "New to Glashus?"
  const swapCta = isSignUp ? "Sign in" : "Create account"

  const nextDestination = resolveBoardHref(
    isSignUp ? "Onboarding.dc.html" : "Main.dc.html"
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(nextDestination)
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
          onClick={() => router.push(nextDestination)}
        >
          <Icon glyph="globe" size={18} />
          Continue with Google
        </button>

        <div className="row xs muted" style={{ gap: 12 }}>
          <hr className="hr grow" />
          <span>or</span>
          <hr className="hr grow" />
        </div>

        <form onSubmit={handleSubmit} className="col" style={{ gap: 16 }}>
          {isSignUp ? (
            <Field
              label="Name"
              placeholder="Anas"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : null}

          <Field
            label="Email"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Field
            label="Password"
            placeholder="At least 10 characters"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            note="Use a long phrase. We never see it."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="btn btn-lg btn-primary"
            style={{ width: "100%", marginTop: 4 }}
          >
            {cta}
          </button>
        </form>

        <p className="sm muted center" style={{ margin: 0 }}>
          {swapText}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp((prev) => !prev)}
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
