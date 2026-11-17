import Link from "next/link"
import { Button } from "@workspace/ui/components/glashus"
import { resolveBoardHref } from "@workspace/ui/lib/routes"

export function NotFoundScreen() {
  return (
    <div className="plain col" style={{ minHeight: "100vh" }}>
      <header
        className="lwrap row wrap between"
        style={{ width: "100%", paddingTop: 22, paddingBottom: 22 }}
      >
        <Link
          href={resolveBoardHref("Landing.dc.html")}
          className="row"
          style={{ gap: 10 }}
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
          <span
            style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}
          >
            Glashus
          </span>
        </Link>

        <nav className="row wrap" style={{ gap: 4 }} aria-label="Site">
          <Link
            href={resolveBoardHref("Landing.dc.html#features")}
            className="btn btn-md btn-ghost"
          >
            Features
          </Link>
          <Link
            href={resolveBoardHref("Landing.dc.html#cloud")}
            className="btn btn-md btn-ghost"
          >
            Google Cloud
          </Link>
          <Link
            href={resolveBoardHref("Landing.dc.html#faq")}
            className="btn btn-md btn-ghost"
          >
            FAQ
          </Link>
          <Button label="Sign in" variant="ghost" size="md" href="Auth.dc.html" />
          <Button
            label="Get started"
            variant="dark"
            size="md"
            href="Onboarding.dc.html"
          />
        </nav>
      </header>

      <div
        className="col center grow"
        style={{ padding: "40px 24px", gap: 22, flex: 1 }}
      >
        <div
          className="glass rise"
          style={{ borderRadius: 36, padding: "28px 56px" }}
        >
          <span
            style={{
              fontSize: 148,
              fontWeight: 600,
              letterSpacing: "-0.06em",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            4
            <span
              style={{
                display: "inline-block",
                width: 104,
                height: 104,
                borderRadius: 104,
                border: "14px solid var(--accent)",
                boxSizing: "border-box",
                WebkitBackdropFilter: "blur(6px)",
                backdropFilter: "blur(6px)",
              }}
              aria-hidden="true"
            />
            4
          </span>
        </div>

        <div
          className="col rise"
          style={{ gap: 8, alignItems: "center", animationDelay: "80ms" }}
        >
          <h1 className="h1">Nothing to see here.</h1>
          <p
            className="lead"
            style={{ fontSize: 16, textAlign: "center", maxWidth: 440 }}
          >
            This page does not exist, or it is private and you are not on the
            list. Either way, we will not say which.
          </p>
        </div>

        <div
          className="row wrap rise"
          style={{
            gap: 10,
            justifyContent: "center",
            animationDelay: "140ms",
          }}
        >
          <Button
            label="Back to my drive"
            variant="primary"
            size="lg"
            href="Main.dc.html"
          />
          <Button
            label="Go to the home page"
            variant="secondary"
            size="lg"
            href="Landing.dc.html"
          />
        </div>

        <span className="xs muted">
          Opened a shared link? It may have expired. Ask the owner for a new
          one.
        </span>
      </div>
    </div>
  )
}
