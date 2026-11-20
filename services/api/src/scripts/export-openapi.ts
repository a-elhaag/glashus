import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { app, OPENAPI_CONFIG } from "../app.js"

const spec = app.getOpenAPI31Document(OPENAPI_CONFIG)
const outPath = resolve(import.meta.dirname, "../../openapi.json")

writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8")
console.log(`Wrote OpenAPI spec to ${outPath}`)
