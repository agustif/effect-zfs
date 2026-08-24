import fs from "node:fs/promises"
import { stripComments } from "./c-parser.mjs"

export const extractErrors = (source, aliases = {}) => {
  const match = /typedef\s+enum\s+zfs_error\s*\{([\s\S]*?)\}\s*zfs_error_t\s*;/m.exec(stripComments(source))
  if (!match) throw new Error("Could not find zfs_error_t")
  const out = []
  let next = 0
  for (const raw of match[1].split(",")) {
    const token = raw.trim()
    if (!token) continue
    const m = /^(EZFS_[A-Z0-9_]+)(?:\s*=\s*(\d+))?/.exec(token)
    if (!m) continue
    if (m[2]) next = Number(m[2])
    const code = m[1]
    out.push({ code, value: next, tag: aliases[code] ?? null })
    next++
  }
  return out
}

export const extractErrorFile = async ({ headerPath, patchPath }) => {
  const [source, raw] = await Promise.all([fs.readFile(headerPath, "utf8"), fs.readFile(patchPath, "utf8")])
  return extractErrors(source, JSON.parse(raw))
}
