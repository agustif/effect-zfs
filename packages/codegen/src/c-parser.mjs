export const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")

export const splitArgs = (text) => {
  const out = []
  let start = 0
  let depth = 0
  let quote = null
  let escape = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (escape) escape = false
      else if (ch === "\\") escape = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "\"" || ch === "'") {
      quote = ch
      continue
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++
    else if (ch === ")" || ch === "}" || ch === "]") depth--
    else if (ch === "," && depth === 0) {
      out.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(text.slice(start).trim())
  return out
}

export const findCalls = (source, prefix = "zprop_register_") => {
  const clean = stripComments(source)
  const calls = []
  const re = new RegExp(`\\b(${prefix}[A-Za-z0-9_]+)\\s*\\(`, "g")
  let match
  while ((match = re.exec(clean))) {
    let i = re.lastIndex
    let depth = 1
    let quote = null
    let escape = false
    for (; i < clean.length; i++) {
      const ch = clean[i]
      if (quote) {
        if (escape) escape = false
        else if (ch === "\\") escape = true
        else if (ch === quote) quote = null
        continue
      }
      if (ch === "\"" || ch === "'") quote = ch
      else if (ch === "(") depth++
      else if (ch === ")") {
        depth--
        if (depth === 0) break
      }
    }
    if (depth !== 0) throw new Error(`Unclosed call ${match[1]}`)
    calls.push({ name: match[1], args: splitArgs(clean.slice(re.lastIndex, i)) })
    re.lastIndex = i + 1
  }
  return calls
}

export const parseIndexTables = (source) => {
  const clean = stripComments(source)
  const tables = new Map()
  const re = /static\s+const\s+zprop_index_t\s+([A-Za-z0-9_]+)\s*\[\s*\]\s*=\s*\{([\s\S]*?)\};/g
  let match
  while ((match = re.exec(clean))) {
    const values = []
    const entryRe = /\{\s*"([^"]+)"\s*,/g
    let entry
    while ((entry = entryRe.exec(match[2]))) values.push(entry[1])
    tables.set(match[1], values)
  }
  return tables
}

export const unquote = (value) => {
  const s = value.trim()
  if (s === "NULL") return null
  // Join adjacent C string literals: "foo" "bar" -> "foobar".
  if (s.includes("\"")) {
    const parts = []
    const re = /"((?:\\.|[^"\\])*)"/g
    let match
    while ((match = re.exec(s))) parts.push(JSON.parse(`"${match[1]}"`))
    if (parts.length > 0) return parts.join("")
  }
  return s
}

export const isPropertyName = (name) => typeof name === "string" && /^[a-z][a-z0-9_-]*$/.test(name)

export const parseTargets = (expr) => {
  // OpenZFS uses both individual type bits and ZFS_TYPE_DATASET, which is
  // defined upstream as filesystem | volume | snapshot. Expand the macro
  // explicitly so generated applicability stays semantic rather than exposing
  // a C implementation detail.
  const out = new Set()
  if (expr.includes("ZFS_TYPE_DATASET")) {
    out.add("filesystem")
    out.add("volume")
    out.add("snapshot")
  }
  const map = {
    ZFS_TYPE_FILESYSTEM: "filesystem",
    ZFS_TYPE_VOLUME: "volume",
    ZFS_TYPE_SNAPSHOT: "snapshot",
    ZFS_TYPE_BOOKMARK: "bookmark",
    ZFS_TYPE_POOL: "pool",
    ZFS_TYPE_VDEV: "vdev"
  }
  for (const [token, target] of Object.entries(map)) {
    if (expr.includes(token)) out.add(target)
  }
  return [...out]
}

export const parseAccess = (expr) =>
  ({
    PROP_READONLY: "readonly",
    PROP_INHERIT: "inheritable",
    PROP_DEFAULT: "mutable",
    PROP_ONETIME: "setOnce",
    PROP_ONETIME_DEFAULT: "setOnce"
  })[expr.trim()] ?? "mutable"
