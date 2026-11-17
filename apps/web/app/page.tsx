import type { Metadata } from "next"
import Link from "next/link"
import {
  Button,
  Chip,
  FileTile,
  Icon,
} from "@workspace/ui/components/glashus"
import { resolveBoardHref } from "@workspace/ui/lib/routes"

export const metadata: Metadata = {
  title: "Glashus — Exposure-Aware Cloud Drive",
  description:
    "Your drive shows your files. Glashus shows who can see them.",
}

const FEATURE_GROUPS = [
  {
    heading: "Secure base",
    items: [
      { n: "01", title: "Core drive", desc: "Upload, folders, preview, search" },
      {
        n: "02",
        title: "Quarantine scan",
        desc: "Every file is checked before it lands",
      },
      { n: "03", title: "Audit log", desc: "Who did what, and when" },
      { n: "04", title: "Version history", desc: "Restore any earlier version" },
      { n: "05", title: "Auto-delete", desc: "Trash with self-destruct timers" },
    ],
  },
  {
    heading: "Exposure control",
    items: [
      { n: "06", title: "Share dashboard", desc: "Every link in one table" },
      { n: "07", title: "Expiring links", desc: "PIN and download cap" },
      {
        n: "08",
        title: "Secret and PII scanner",
        desc: "IDs, bank numbers, API keys",
      },
      { n: "09", title: "Redact and block", desc: "Share a clean copy instead" },
      { n: "10", title: "Exposure map", desc: "Files, people, links, AI" },
      { n: "11", title: "Canary files", desc: "Bait that reports snooping" },
      { n: "12", title: "Mass-change alerts", desc: "Catch bulk deletes early" },
    ],
  },
  {
    heading: "AI, with consent",
    items: [
      {
        n: "13",
        title: "Consent-first AI",
        desc: "Per folder, with an access log",
      },
      {
        n: "14",
        title: "Circle and Chat",
        desc: "Ask about one part of a file",
      },
      {
        n: "15",
        title: "Ask my files",
        desc: "Cited answers, injection screened",
      },
      { n: "16", title: "Smart naming", desc: "Suggested names for uploads" },
      { n: "17", title: "AI version diff", desc: "What changed, in plain words" },
      {
        n: "18",
        title: "AI-safe export",
        desc: "Tokenized copy for outside tools",
      },
      {
        n: "19",
        title: "Explainable cleanup",
        desc: "Every suggestion says why",
      },
    ],
  },
  {
    heading: "Your data",
    items: [
      { n: "20", title: "Knowledge graph", desc: "How your files relate" },
      { n: "21", title: "Export everything", desc: "Leave with all of it" },
    ],
  },
] as const

const CLOUD_STEPS = [
  { n: "1", title: "Upload", desc: "Signed URL from the browser" },
  { n: "2", title: "Quarantine", desc: "Cloud Storage bucket" },
  { n: "3", title: "Trigger", desc: "Eventarc" },
  { n: "4", title: "Scan", desc: "Cloud Run job" },
  { n: "5", title: "Detect", desc: "Sensitive Data Protection" },
  { n: "6", title: "Index", desc: "Firestore" },
  { n: "7", title: "Ready", desc: "Clean bucket, versioned" },
] as const

const CLOUD_SERVICES = [
  { name: "Cloud Run", desc: "API and scan workers. Scales to zero." },
  {
    name: "Cloud Storage",
    desc: "Quarantine and clean buckets, versioning, lifecycle rules, signed URLs.",
  },
  {
    name: "Firestore",
    desc: "Metadata, shares, quotas, graph, vectors, audit and AI logs.",
  },
  {
    name: "Firebase Authentication",
    desc: "Sign-in and JWT checks on every request.",
  },
  {
    name: "Vertex AI (Gemini)",
    desc: "Chat, naming, version diff, embeddings at 768 dimensions.",
  },
  {
    name: "Sensitive Data Protection",
    desc: "Deterministic PII and secret detection, redaction.",
  },
  {
    name: "Eventarc",
    desc: "Runs the scan when an object lands in quarantine.",
  },
  {
    name: "Cloud Scheduler",
    desc: "Link expiry, trash timers, cleanup passes.",
  },
  {
    name: "Secret Manager",
    desc: "Keys and signing secrets, never in code.",
  },
  {
    name: "Cloud Monitoring",
    desc: "Uptime, error rates, mass-change alerts.",
  },
] as const

const FAQS = [
  {
    q: "Can Glashus staff read my files?",
    a: "[YOUR ANSWER: describe who has access to the storage buckets and how access is logged.]",
  },
  {
    q: "Does the AI train on my files?",
    a: "Files are sent to Gemini on Vertex AI only when you allow it, with sensitive values masked first. [CONFIRM: state the data-use terms of your Vertex AI agreement.]",
  },
  {
    q: "What happens when a link expires?",
    a: "The signed URL stops working and the link page shows an expired notice. The file itself is untouched.",
  },
  {
    q: "What if the scanner gets it wrong?",
    a: "You can mark a finding as safe, or scan again. Nothing is deleted without a click, and every fix has an undo.",
  },
  {
    q: "Is this a real product?",
    a: "It is a university Cloud Computing project built to production patterns. [YOUR STATUS: demo, beta or live.]",
  },
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

export default function LandingPage() {
  return (
    <div className="plain" style={{ minHeight: "100vh", color: "var(--ink)" }}>
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

      <section
        className="lwrap"
        style={{ paddingTop: 72, paddingBottom: 96 }}
      >
        <div className="col rise" style={{ gap: 22, maxWidth: 880 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(42px, 6vw, 72px)",
              lineHeight: 1.0,
              fontWeight: 600,
              letterSpacing: "-0.045em",
            }}
          >
            Your drive shows your files. Glashus shows who can see them.
          </h1>
          <p className="lead">
            Every upload is scanned. Every link has an end date. Every AI read
            leaves a receipt. One screen tells you what is exposed, and one
            click fixes it.
          </p>
          <div className="row wrap" style={{ gap: 12 }}>
            <Button
              label="Create your drive"
              variant="primary"
              size="lg"
              href="Onboarding.dc.html"
            />
            <Button
              label="See how it is built"
              variant="secondary"
              size="lg"
              href="#cloud"
            />
          </div>
          <span className="xs muted">15 GB free. No card.</span>
        </div>

        <div style={{ marginTop: 56 }}>
          <div
            className="glass rise"
            style={{ borderRadius: 24, padding: 10, animationDelay: "120ms" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] gap-[10px]">
              <div
                className="glass-soft col"
                style={{ borderRadius: 16, padding: 18, gap: 10 }}
              >
                <span className="xs m muted">Exposure score</span>
                <div
                  className="row"
                  style={{ alignItems: "baseline", gap: 4 }}
                >
                  <span
                    style={{
                      fontSize: 52,
                      fontWeight: 600,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                    }}
                  >
                    62
                  </span>
                  <span className="sm muted">/ 100</span>
                </div>
                <div className="bar" style={{ display: "flex" }}>
                  <i style={{ width: "62%" }} />
                  <i style={{ width: "38%", background: "var(--accent)" }} />
                </div>
                <span className="xs muted" style={{ lineHeight: 1.5 }}>
                  3 things need your attention.
                </span>
              </div>

              <div
                className="glass-soft"
                style={{ borderRadius: 16, overflow: "hidden" }}
              >
                <div className="row between" style={{ padding: "12px 14px" }}>
                  <span className="xs m muted">Recent files</span>
                  <span className="xs muted">Visibility</span>
                </div>
                <div
                  className="row"
                  style={{
                    padding: "10px 14px",
                    gap: 12,
                    borderTop: "1px solid rgba(17,17,17,0.05)",
                  }}
                >
                  <FileTile ext="PDF" tone={2} size={32} />
                  <span className="grow sm m ell">tax-return-2025.pdf</span>
                  <span className="xs" style={{ color: "var(--accent)" }}>
                    ID, IBAN
                  </span>
                  <Chip label="Public" tone="accent" />
                </div>
                <div
                  className="row"
                  style={{
                    padding: "10px 14px",
                    gap: 12,
                    borderTop: "1px solid rgba(17,17,17,0.05)",
                  }}
                >
                  <FileTile ext="ENV" tone={2} size={32} />
                  <span className="grow sm m ell">api-config.env</span>
                  <span className="xs" style={{ color: "var(--accent)" }}>
                    API key
                  </span>
                  <Chip label="Shared" tone="neutral" />
                </div>
                <div
                  className="row"
                  style={{
                    padding: "10px 14px",
                    gap: 12,
                    borderTop: "1px solid rgba(17,17,17,0.05)",
                  }}
                >
                  <FileTile ext="PDF" tone={1} size={32} />
                  <span className="grow sm m ell">q3-pitch-deck.pdf</span>
                  <Chip label="Link · 2 days" tone="neutral" />
                </div>
                <div
                  className="row"
                  style={{
                    padding: "10px 14px",
                    gap: 12,
                    borderTop: "1px solid rgba(17,17,17,0.05)",
                  }}
                >
                  <FileTile ext="DOC" tone={0} size={32} />
                  <span className="grow sm m ell">thesis-draft-v4.docx</span>
                  <Chip label="Private" tone="clear" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="lwrap lsec">
        <div className="col" style={{ gap: 14 }}>
          <span className="kick">What it does</span>
          <h2 className="lh2">Three checks other drives skip.</h2>
        </div>

        <div
          className="row wrap"
          style={{ gap: 64, alignItems: "center", padding: "44px 0" }}
        >
          <div
            className="col"
            style={{ gap: 16, flex: "1 1 380px", minWidth: 0, order: 1 }}
          >
            <span className="kick">Before you share</span>
            <h2 className="lh2" style={{ fontSize: 34 }}>
              It reads the file before the link exists.
            </h2>
            <p className="lead" style={{ fontSize: 16 }}>
              Deterministic detectors find IDs, bank numbers and API keys. You
              choose a redacted copy or the original, and the link always has an
              end.
            </p>
            <ul
              style={{
                margin: "4px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Pattern and checksum matching, not AI guesses</span>
              </li>
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Expiry, download cap and PIN on every link</span>
              </li>
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>The original never leaves your drive</span>
              </li>
            </ul>
          </div>

          <div style={{ flex: "1 1 420px", minWidth: 0, order: 2 }}>
            <div
              className="glass col lift"
              style={{ borderRadius: 22, padding: 22, gap: 14 }}
            >
              <div className="row" style={{ gap: 12 }}>
                <FileTile ext="PDF" tone={2} size={40} />
                <div className="col" style={{ gap: 1 }}>
                  <span className="m">Share tax-return-2025.pdf</span>
                  <span className="xs muted">
                    Checked before the link exists
                  </span>
                </div>
              </div>
              <div
                className="glass-soft col"
                style={{ borderRadius: 14, padding: 14, gap: 10 }}
              >
                <span className="sm b">2 sensitive items found</span>
                <div className="row between sm">
                  <span className="muted">National ID</span>
                  <span className="mono">•••• ••• 4821</span>
                </div>
                <div className="row between sm">
                  <span className="muted">IBAN</span>
                  <span className="mono">DE89 •••• •••• 3000 00</span>
                </div>
              </div>
              <div className="row between wrap" style={{ gap: 8 }}>
                <span className="xs muted">
                  Ends in 7 days · 5 downloads · PIN
                </span>
                <Button
                  label="Share redacted copy"
                  variant="primary"
                  size="sm"
                  href="Share.dc.html"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="row wrap"
          style={{ gap: 64, alignItems: "center", padding: "44px 0" }}
        >
          <div
            className="col"
            style={{ gap: 16, flex: "1 1 380px", minWidth: 0, order: 2 }}
          >
            <span className="kick">After you share</span>
            <h2 className="lh2" style={{ fontSize: 34 }}>
              One map of every route out.
            </h2>
            <p className="lead" style={{ fontSize: 16 }}>
              Links, people and AI reads drawn on a single graph. The exposed
              routes are the only colored lines.
            </p>
            <ul
              style={{
                margin: "4px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Exposure score that moves when you fix things</span>
              </li>
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Canary files that alert you when opened</span>
              </li>
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Alerts when many files change at once</span>
              </li>
            </ul>
          </div>

          <div style={{ flex: "1 1 420px", minWidth: 0, order: 1 }}>
            <div className="glass lift" style={{ borderRadius: 22, padding: 18 }}>
              <svg
                viewBox="0 0 420 240"
                width="100%"
                height="240"
                role="img"
                aria-label="Exposure map sample"
                style={{ color: "var(--accent)" }}
              >
                <line
                  x1="210"
                  y1="120"
                  x2="90"
                  y2="50"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="90"
                  y1="50"
                  x2="330"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="210"
                  y1="120"
                  x2="340"
                  y2="170"
                  stroke="rgba(17,17,17,0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="4 5"
                />
                <line
                  x1="210"
                  y1="120"
                  x2="80"
                  y2="190"
                  stroke="rgba(17,17,17,0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="4 5"
                />
                <circle
                  cx="210"
                  cy="120"
                  r="22"
                  fill="#fff"
                  stroke="rgba(17,17,17,0.2)"
                />
                <circle
                  cx="90"
                  cy="50"
                  r="16"
                  fill="#fff"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle
                  cx="330"
                  cy="40"
                  r="16"
                  fill="#fff"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle
                  cx="340"
                  cy="170"
                  r="14"
                  fill="#fff"
                  stroke="rgba(17,17,17,0.2)"
                />
                <circle
                  cx="80"
                  cy="190"
                  r="14"
                  fill="#fff"
                  stroke="rgba(17,17,17,0.2)"
                />
                <text
                  x="210"
                  y="124"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#111"
                >
                  You
                </text>
                <text
                  x="90"
                  y="82"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#2E2E2E"
                >
                  tax-return.pdf
                </text>
                <text
                  x="330"
                  y="72"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#2E2E2E"
                >
                  Public web
                </text>
                <text
                  x="340"
                  y="200"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#2E2E2E"
                >
                  Gemini
                </text>
                <text
                  x="80"
                  y="220"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#2E2E2E"
                >
                  4 people
                </text>
              </svg>
            </div>
          </div>
        </div>

        <div
          className="row wrap"
          style={{ gap: 64, alignItems: "center", padding: "44px 0" }}
        >
          <div
            className="col"
            style={{ gap: 16, flex: "1 1 380px", minWidth: 0, order: 1 }}
          >
            <span className="kick">When AI helps</span>
            <h2 className="lh2" style={{ fontSize: 34 }}>
              AI reads nothing without a receipt.
            </h2>
            <p className="lead" style={{ fontSize: 16 }}>
              Consent is per folder. Sensitive values are masked before anything
              is sent. Instructions hidden inside files are stripped.
            </p>
            <ul
              style={{
                margin: "4px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>A log of every read: file, purpose, what was sent</span>
              </li>
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Answers cite the page they came from</span>
              </li>
              <li
                className="row sm"
                style={{ gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ color: "var(--accent)", marginTop: 2 }}>
                  <Icon glyph="check" size={16} />
                </span>
                <span>Pause all AI in one click</span>
              </li>
            </ul>
          </div>

          <div style={{ flex: "1 1 420px", minWidth: 0, order: 2 }}>
            <div
              className="glass col lift"
              style={{ borderRadius: 22, padding: 22, gap: 6 }}
            >
              <div className="row between" style={{ paddingBottom: 8 }}>
                <span className="m">AI access log</span>
                <Chip
                  label="0 reads without consent"
                  tone="clear"
                  icon="check"
                />
              </div>
              <div
                className="row"
                style={{
                  padding: "12px 4px",
                  gap: 12,
                  borderTop: "1px solid rgba(17,17,17,0.06)",
                }}
              >
                <span className="xs muted" style={{ width: 44 }}>
                  12:41
                </span>
                <div className="grow col" style={{ gap: 1, minWidth: 0 }}>
                  <span className="sm m ell">tax-return-2025.pdf</span>
                  <span className="xs muted">
                    Text sent with 2 values masked
                  </span>
                </div>
                <Chip label="Chat" tone="neutral" />
              </div>
              <div
                className="row"
                style={{
                  padding: "12px 4px",
                  gap: 12,
                  borderTop: "1px solid rgba(17,17,17,0.06)",
                }}
              >
                <span className="xs muted" style={{ width: 44 }}>
                  11:02
                </span>
                <div className="grow col" style={{ gap: 1, minWidth: 0 }}>
                  <span className="sm m ell">lease-agreement.pdf</span>
                  <span className="xs muted">3 passages, nothing to mask</span>
                </div>
                <Chip label="Ask files" tone="neutral" />
              </div>
              <div
                className="row"
                style={{
                  padding: "12px 4px",
                  gap: 12,
                  borderTop: "1px solid rgba(17,17,17,0.06)",
                }}
              >
                <span className="xs muted" style={{ width: 44 }}>
                  10:15
                </span>
                <div className="grow col" style={{ gap: 1, minWidth: 0 }}>
                  <span className="sm m ell">IMG_4032.jpg</span>
                  <span className="xs muted">Image only, location removed</span>
                </div>
                <Chip label="Naming" tone="neutral" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="lwrap lsec">
        <div className="col" style={{ gap: 14, marginBottom: 36 }}>
          <span className="kick">Feature list</span>
          <h2 className="lh2">Twenty-one features. No filler.</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 32,
          }}
        >
          {FEATURE_GROUPS.map((group) => (
            <div key={group.heading} className="col" style={{ gap: 8 }}>
              <h3 className="h3">{group.heading}</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {group.items.map((item) => (
                  <li
                    key={item.n}
                    className="row"
                    style={{
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "10px 0",
                      borderTop: "1px solid rgba(17,17,17,0.07)",
                    }}
                  >
                    <span className="mono muted" style={{ width: 22 }}>
                      {item.n}
                    </span>
                    <div className="col" style={{ gap: 1 }}>
                      <span className="sm m">{item.title}</span>
                      <span className="xs muted">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="cloud" className="lwrap lsec">
        <div
          className="row wrap between"
          style={{ alignItems: "flex-end", gap: 24, marginBottom: 36 }}
        >
          <div className="col" style={{ gap: 14 }}>
            <span className="kick">Built on Google Cloud</span>
            <h2 className="lh2">Ten managed services. No servers to patch.</h2>
            <p className="lead" style={{ fontSize: 16 }}>
              The whole stack is defined in Terraform and shipped by GitHub
              Actions. This is the path one file takes.
            </p>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 22, padding: 14 }}>
          <div className="row wrap" style={{ gap: 8, alignItems: "stretch" }}>
            {CLOUD_STEPS.map((step) => (
              <div
                key={step.n}
                className="glass-soft col"
                style={{
                  flex: "1 1 120px",
                  borderRadius: 14,
                  padding: 14,
                  gap: 4,
                }}
              >
                <span className="mono muted">{step.n}</span>
                <span className="sm b">{step.title}</span>
                <span className="xs muted">{step.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "0 56px",
            marginTop: 36,
          }}
        >
          {CLOUD_SERVICES.map((svc) => (
            <div
              key={svc.name}
              className="row"
              style={{
                gap: 16,
                alignItems: "baseline",
                padding: "14px 0",
                borderTop: "1px solid rgba(17,17,17,0.07)",
              }}
            >
              <span className="sm b" style={{ flex: "0 0 210px" }}>
                {svc.name}
              </span>
              <span className="sm muted">{svc.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="lwrap lsec">
        <div
          className="row wrap"
          style={{ gap: 64, alignItems: "flex-start" }}
        >
          <div className="col" style={{ gap: 14, flex: "0 1 320px" }}>
            <span className="kick">FAQ</span>
            <h2 className="lh2" style={{ fontSize: 34 }}>
              Fair questions.
            </h2>
          </div>
          <div style={{ flex: "1 1 520px", minWidth: 0 }}>
            {FAQS.map((item) => (
              <details key={item.q} className="faq">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="lwrap" style={{ paddingBottom: 88 }}>
        <div
          className="glass row wrap between"
          style={{ borderRadius: 28, padding: "44px 48px", gap: 24 }}
        >
          <div className="col" style={{ gap: 8 }}>
            <h2 className="lh2" style={{ fontSize: 34 }}>
              See your own exposure score.
            </h2>
            <p className="lead" style={{ fontSize: 16 }}>
              Upload one file. The first scan takes a few seconds.
            </p>
          </div>
          <Button
            label="Create your drive"
            variant="primary"
            size="lg"
            href="Onboarding.dc.html"
          />
        </div>
      </section>

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
