export interface DetectedFinding {
  id: string
  type: string
  location: string
  maskedValue: string
  detector: "dlp" | "regex" | "entropy"
  safe: boolean
}

export interface ScanOutcome {
  malware: boolean
  blockedReason: string | null
  findings: DetectedFinding[]
}

const EICAR_SIGNATURE =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

const EXECUTABLE_EXTENSIONS = new Set(["exe", "bat", "cmd", "scr", "com", "pif"])

const TEXT_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-sh",
  "application/csv",
]

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "env",
  "log",
  "yaml",
  "yml",
  "xml",
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "sql",
  "html",
  "css",
])

interface PatternRule {
  type: string
  detector: "dlp" | "regex" | "entropy"
  regex: RegExp
  mask: (raw: string) => string
}

function maskKeepTail(raw: string, keepStart: number, keepEnd: number): string {
  const trimmed = raw.trim()
  if (trimmed.length <= keepStart + keepEnd + 2) {
    return "••••••••"
  }
  const head = keepStart > 0 ? trimmed.slice(0, keepStart) : ""
  const tail = keepEnd > 0 ? trimmed.slice(-keepEnd) : ""
  return `${head} •••• ${tail}`.trim()
}

function maskEmail(raw: string): string {
  const [local, domain] = raw.split("@")
  if (!local || !domain) return "••••@••••"
  const prefix = local.slice(0, Math.min(2, local.length))
  return `${prefix}••••@${domain}`
}

const PATTERN_RULES: PatternRule[] = [
  {
    type: "Google API key",
    detector: "entropy",
    regex: /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
    mask: (raw) => maskKeepTail(raw, 6, 4),
  },
  {
    type: "API secret key",
    detector: "entropy",
    regex: /\bsk-[A-Za-z0-9\-_]{16,}\b/g,
    mask: (raw) => maskKeepTail(raw, 5, 4),
  },
  {
    type: "IBAN",
    detector: "regex",
    regex: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,
    mask: (raw) => maskKeepTail(raw, 4, 4),
  },
  {
    type: "National ID",
    detector: "regex",
    regex: /\b(?:\d{3}-\d{4}-\d{7}-\d|\d{3}-\d{2}-\d{4})\b/g,
    mask: (raw) => maskKeepTail(raw, 0, 4),
  },
  {
    type: "Email address",
    detector: "dlp",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    mask: maskEmail,
  },
  {
    type: "Phone number",
    detector: "dlp",
    regex: /\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g,
    mask: (raw) => maskKeepTail(raw, 3, 2),
  },
]

export function isTextInspectable(filename: string, mime: string): boolean {
  const lowerMime = mime.toLowerCase()
  if (TEXT_MIME_PREFIXES.some((prefix) => lowerMime.startsWith(prefix))) {
    return true
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  return TEXT_EXTENSIONS.has(ext)
}

export function scanBuffer(
  filename: string,
  mime: string,
  buffer: Buffer
): ScanOutcome {
  const utf8Sample = buffer.toString("utf8")
  if (utf8Sample.includes(EICAR_SIGNATURE)) {
    return {
      malware: true,
      blockedReason:
        "Blocked · EICAR malware test signature detected. Deleted from quarantine.",
      findings: [],
    }
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  const hasMzHeader = buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a
  if (EXECUTABLE_EXTENSIONS.has(ext) && hasMzHeader) {
    return {
      malware: true,
      blockedReason:
        "Blocked · executable binary rejected by quarantine policy. Deleted from quarantine.",
      findings: [],
    }
  }

  if (!isTextInspectable(filename, mime) && looksBinary(buffer)) {
    return {
      malware: false,
      blockedReason: null,
      findings: [],
    }
  }

  const findings: DetectedFinding[] = []
  const seen = new Set<string>()
  const lines = utf8Sample.split(/\r?\n/)

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const line = lines[lineIdx] ?? ""
    if (!line) continue
    for (const rule of PATTERN_RULES) {
      rule.regex.lastIndex = 0
      let match: RegExpExecArray | null = rule.regex.exec(line)
      while (match !== null) {
        const raw = match[0]
        const maskedValue = rule.mask(raw)
        const dedupKey = `${rule.type}:${lineIdx + 1}:${maskedValue}`
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey)
          findings.push({
            id: `fnd_${findings.length + 1}`,
            type: rule.type,
            location: `Line ${lineIdx + 1}`,
            maskedValue,
            detector: rule.detector,
            safe: false,
          })
        }
        match = rule.regex.exec(line)
        if (findings.length >= 50) break
      }
      if (findings.length >= 50) break
    }
    if (findings.length >= 50) break
  }

  return {
    malware: false,
    blockedReason: null,
    findings,
  }
}

export function maskAndRedactText(input: string): {
  redactedText: string
  maskedCount: number
} {
  let out = input
  let maskedCount = 0

  for (const rule of PATTERN_RULES) {
    const replacementTag = `[REDACTED:${rule.type.toUpperCase().replace(/\s+/g, "_")}]`
    const freshRegex = new RegExp(rule.regex.source, rule.regex.flags)
    out = out.replace(freshRegex, () => {
      maskedCount += 1
      return replacementTag
    })
  }

  return { redactedText: out, maskedCount }
}

const INJECTION_LINE_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /reveal\s+(your\s+)?secrets?/i,
]

export function stripPromptInjection(input: string): {
  cleanText: string
  strippedCount: number
} {
  let strippedCount = 0
  const keptLines = input.split(/\r?\n/).filter((line) => {
    const flagged = INJECTION_LINE_PATTERNS.some((re) => re.test(line))
    if (flagged) {
      strippedCount += 1
      return false
    }
    return true
  })
  return { cleanText: keptLines.join("\n"), strippedCount }
}

function looksBinary(buffer: Buffer): boolean {
  const sampleLen = Math.min(buffer.length, 4096)
  for (let i = 0; i < sampleLen; i += 1) {
    if (buffer[i] === 0) return true
  }
  return false
}
