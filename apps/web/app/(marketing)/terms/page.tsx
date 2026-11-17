import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@workspace/ui/components/glashus"
import { resolveBoardHref } from "@workspace/ui/lib/routes"

export const metadata: Metadata = {
  title: "Glashus — Terms of service",
}

const TOC_ITEMS = [
  { id: "s1", label: "Using Glashus" },
  { id: "s2", label: "Your account" },
  { id: "s3", label: "Your content" },
  { id: "s4", label: "Acceptable use" },
  { id: "s5", label: "Scanning and blocking" },
  { id: "s6", label: "AI features" },
  { id: "s7", label: "Sharing" },
  { id: "s8", label: "Storage and limits" },
  { id: "s9", label: "Ending things" },
  { id: "s10", label: "Disclaimers and liability" },
  { id: "s11", label: "Law and contact" },
] as const

function BrandMark() {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        background: "linear-gradient(145deg, #fff, rgba(255,255,255,0.35))",
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
  )
}

export default function TermsPage() {
  return (
    <div className="plain" style={{ minHeight: "100vh" }}>
      <header
        className="lwrap row wrap between"
        style={{ paddingTop: 22, paddingBottom: 22 }}
      >
        <Link
          href={resolveBoardHref("Landing.dc.html")}
          className="row"
          style={{ gap: 10 }}
        >
          <BrandMark />
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
        className="lwrap row wrap"
        style={{
          gap: 64,
          alignItems: "flex-start",
          paddingTop: 48,
          paddingBottom: 88,
        }}
      >
        <aside className="col" style={{ flex: "0 0 230px", gap: 0 }}>
          <span className="xs b" style={{ paddingBottom: 8 }}>
            On this page
          </span>
          {TOC_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="sm muted"
              style={{ padding: "5px 0" }}
            >
              {item.label}
            </a>
          ))}
          <hr className="hr" style={{ margin: "14px 0" }} />
          <Link href={resolveBoardHref("Privacy.dc.html")} className="sm m">
            Privacy policy
          </Link>
        </aside>

        <article
          className="legal rise"
          style={{ flex: "1 1 560px", minWidth: 0, maxWidth: 720 }}
        >
          <span className="kick">Legal</span>
          <h1
            style={{
              margin: "10px 0 8px",
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: "-0.035em",
            }}
          >
            Terms of service
          </h1>
          <p className="sm muted">
            Effective [EFFECTIVE DATE] · Draft template, not legal advice. Have
            it reviewed before launch.
          </p>
          <p style={{ fontSize: 17, marginTop: 20 }}>
            The short version: your files are yours, do not use Glashus to harm
            people, and this is a student project offered as is.
          </p>

          <h2 id="s1">1. Using Glashus</h2>
          <p>
            By creating an account you agree to these terms. You must be at
            least [AGE] and able to form a contract where you live.
          </p>

          <h2 id="s2">2. Your account</h2>
          <p>
            Keep your sign-in safe. You are responsible for what happens under
            your account. Tell us at [CONTACT EMAIL] if you think it was
            accessed without permission.
          </p>

          <h2 id="s3">3. Your content</h2>
          <p>
            You own your files. You give us permission to store, scan, process
            and display them only as needed to run the features you use.
          </p>

          <h2 id="s4">4. Acceptable use</h2>
          <ul>
            <li>No malware, and no attempts to bypass the scanner.</li>
            <li>
              No content that is illegal where you live or that you have no
              right to store or share.
            </li>
            <li>
              No attacks on the service or on other people’s accounts.
            </li>
            <li>
              Canary files are for detecting snooping on your own drive only.
            </li>
          </ul>

          <h2 id="s5">5. Scanning and blocking</h2>
          <p>
            Every upload is scanned in quarantine. Files that match malware
            signatures are blocked and deleted. Sensitive-data findings are
            advice. Detection is not perfect and may miss things or flag safe
            content.
          </p>

          <h2 id="s6">6. AI features</h2>
          <p>
            AI answers, names and summaries can be wrong. Check anything
            important against the source file. AI reads your files only with
            your consent.
          </p>

          <h2 id="s7">7. Sharing</h2>
          <p>
            You decide what to share and with whom. You are responsible for links
            you create until they expire or you revoke them.
          </p>

          <h2 id="s8">8. Storage and limits</h2>
          <p>
            The free plan includes 15 GB. We may limit uploads when you reach
            it. [PAID PLANS, IF ANY]
          </p>

          <h2 id="s9">9. Ending things</h2>
          <p>
            You can delete your account at any time. We may suspend accounts
            that break these terms. [NOTICE PERIOD]
          </p>

          <h2 id="s10">10. Disclaimers and liability</h2>
          <p>
            Glashus is provided as is, without warranties. Keep your own backups
            of anything important. [LIABILITY CAP AND EXCLUSIONS, PER YOUR
            JURISDICTION]
          </p>

          <h2 id="s11">11. Law and contact</h2>
          <p>
            These terms are governed by the law of [GOVERNING LAW]. Questions:
            [CONTACT EMAIL].
          </p>
        </article>
      </div>

      <footer
        className="lwrap"
        style={{
          paddingTop: 48,
          paddingBottom: 40,
          borderTop: "1px solid rgba(17,17,17,0.08)",
        }}
      >
        <div
          className="row wrap between"
          style={{ alignItems: "flex-start", gap: 40 }}
        >
          <div className="col" style={{ gap: 10, maxWidth: 320 }}>
            <Link
              href={resolveBoardHref("Landing.dc.html")}
              className="row"
              style={{ gap: 10 }}
            >
              <BrandMark />
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Glashus
              </span>
            </Link>
            <span className="sm muted">
              A cloud drive that shows who can see your files. Built as a Cloud
              Computing course project.
            </span>
          </div>
          <div
            className="row wrap"
            style={{ gap: 64, alignItems: "flex-start" }}
          >
            <div className="col" style={{ gap: 10 }}>
              <span className="xs b">Product</span>
              <Link
                href={resolveBoardHref("Landing.dc.html#features")}
                className="sm muted"
              >
                Features
              </Link>
              <Link
                href={resolveBoardHref("Landing.dc.html#cloud")}
                className="sm muted"
              >
                How it is built
              </Link>
              <Link href={resolveBoardHref("Auth.dc.html")} className="sm muted">
                Sign in
              </Link>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <span className="xs b">Legal</span>
              <Link
                href={resolveBoardHref("Terms.dc.html")}
                className="sm muted"
              >
                Terms
              </Link>
              <Link
                href={resolveBoardHref("Privacy.dc.html")}
                className="sm muted"
              >
                Privacy
              </Link>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <span className="xs b">Project</span>
              <Link href={resolveBoardHref("Kit.dc.html")} className="sm muted">
                Component kit
              </Link>
              <Link
                href={resolveBoardHref("Motion.dc.html")}
                className="sm muted"
              >
                Motion
              </Link>
              <Link
                href={resolveBoardHref("Shortcuts.dc.html")}
                className="sm muted"
              >
                Shortcuts
              </Link>
            </div>
          </div>
        </div>
        <p
          className="xs muted"
          style={{ margin: "36px 0 0", maxWidth: 760, lineHeight: 1.6 }}
        >
          Google Cloud, Firebase, Vertex AI and Gemini are trademarks of Google
          LLC. Glashus is a student project and is not affiliated with or
          endorsed by Google.
        </p>
      </footer>
    </div>
  )
}
