import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@workspace/ui/components/glashus"
import { resolveBoardHref } from "@workspace/ui/lib/routes"

export const metadata: Metadata = {
  title: "Glashus — Privacy policy",
}

const TOC_ITEMS = [
  { id: "s1", label: "What we collect" },
  { id: "s2", label: "How we use it" },
  { id: "s3", label: "AI processing" },
  { id: "s4", label: "Where it is stored" },
  { id: "s5", label: "Who else sees it" },
  { id: "s6", label: "How long we keep it" },
  { id: "s7", label: "Your choices" },
  { id: "s8", label: "Children" },
  { id: "s9", label: "Changes and contact" },
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

export default function PrivacyPage() {
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
          <Link href={resolveBoardHref("Terms.dc.html")} className="sm m">
            Terms of service
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
            Privacy policy
          </h1>
          <p className="sm muted">
            Effective [EFFECTIVE DATE] · Draft template, not legal advice. Have
            it reviewed before launch.
          </p>
          <p style={{ fontSize: 17, marginTop: 20 }}>
            Glashus exists to show you who can see your files. This page says
            what we can see, and why.
          </p>

          <h2 id="s1">1. What we collect</h2>
          <ul>
            <li>
              <b>Account:</b> name and email from Firebase Authentication.
            </li>
            <li>
              <b>Files:</b> what you upload, plus name, size, type and versions.
            </li>
            <li>
              <b>Scan findings:</b> the type and location of sensitive data.
              Values are stored masked.
            </li>
            <li>
              <b>Activity:</b> uploads, shares, deletions and sign-ins, kept in
              your audit log.
            </li>
            <li>
              <b>Link visits:</b> time, IP address and browser of people who
              open your shared links.
            </li>
          </ul>

          <h2 id="s2">2. How we use it</h2>
          <p>
            To store and show your files, scan them, compute your exposure
            score, and alert you to risky changes. We do not sell your data or
            show ads.
          </p>

          <h2 id="s3">3. AI processing</h2>
          <p>
            AI features are off until you allow them, per folder. When allowed,
            the needed text or image is sent to Gemini on Google Cloud Vertex AI
            with detected sensitive values masked first. Every read is written
            to your AI access log.
          </p>
          <p>
            [CONFIRM AGAINST YOUR GOOGLE CLOUD TERMS: whether prompts and files
            are used to train models, and how long they are retained.]
          </p>

          <h2 id="s4">4. Where it is stored</h2>
          <p>
            Files and metadata are stored on Google Cloud in [REGION]. Data is
            encrypted in transit and at rest.
          </p>

          <h2 id="s5">5. Who else sees it</h2>
          <ul>
            <li>
              People you share with see only what you share, until the link
              ends.
            </li>
            <li>
              Google Cloud processes data for us as an infrastructure provider.
            </li>
            <li>
              We disclose data when the law requires it. [YOUR PROCESS]
            </li>
          </ul>

          <h2 id="s6">6. How long we keep it</h2>
          <ul>
            <li>Trash: 30 days, then deleted for good.</li>
            <li>Old versions: [N] versions or [N] days.</li>
            <li>Audit and AI logs: [N] days.</li>
            <li>Deleted accounts: removed within [N] days.</li>
          </ul>

          <h2 id="s7">7. Your choices</h2>
          <p>
            Export all your data, delete your account, turn AI off, or revoke
            any link at any time from Settings. Depending on where you live you
            may have further rights. [LIST BY JURISDICTION]
          </p>

          <h2 id="s8">8. Children</h2>
          <p>Glashus is not for children under [AGE].</p>

          <h2 id="s9">9. Changes and contact</h2>
          <p>
            We will tell you in the app before material changes take effect.
            Questions: [CONTACT EMAIL].
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
