import type { DelegInherit, DelegWhoKind } from "../Args.js"

export type ParsedAllowSet = {
  readonly name: string
  readonly permissions: ReadonlyArray<string>
}

export type ParsedAllowGrant = {
  readonly who: {
    readonly kind: DelegWhoKind
    readonly name?: string
  }
  readonly inherit: DelegInherit
  readonly permissions: ReadonlyArray<string>
}

export type ParsedAllowListing = {
  readonly setpoint: string
  readonly sets: ReadonlyArray<ParsedAllowSet>
  readonly create: ReadonlyArray<string>
  readonly grants: ReadonlyArray<ParsedAllowGrant>
}

const headerRe = /^---- Permissions on (.+?) -+$/
const tokens = (rest: string): ReadonlyArray<string> =>
  rest.split(",").map((part) => part.trim()).filter((part) => part.length > 0)

const parseUge = (body: string, inherit: DelegInherit): ParsedAllowGrant | undefined => {
  if (body.startsWith("everyone")) {
    const rest = body.slice("everyone".length).trim()
    return {
      who: { kind: "everyone" },
      inherit,
      permissions: tokens(rest)
    }
  }
  if (body.startsWith("user ")) {
    const rest = body.slice("user ".length).trim()
    const space = rest.indexOf(" ")
    if (space <= 0) {
      return { who: { kind: "user", name: rest }, inherit, permissions: [] }
    }
    return {
      who: { kind: "user", name: rest.slice(0, space) },
      inherit,
      permissions: tokens(rest.slice(space + 1))
    }
  }
  if (body.startsWith("group ")) {
    const rest = body.slice("group ".length).trim()
    const space = rest.indexOf(" ")
    if (space <= 0) {
      return { who: { kind: "group", name: rest }, inherit, permissions: [] }
    }
    return {
      who: { kind: "group", name: rest.slice(0, space) },
      inherit,
      permissions: tokens(rest.slice(space + 1))
    }
  }
  return undefined
}

const parseSetLine = (body: string): ParsedAllowSet | undefined => {
  if (!body.startsWith("@")) return undefined
  const space = body.indexOf(" ")
  if (space <= 0) return { name: body, permissions: [] }
  return { name: body.slice(0, space), permissions: tokens(body.slice(space + 1)) }
}

type Section = "sets" | "create" | DelegInherit

const sectionOf = (line: string): Section | undefined => {
  if (line === "Permission sets:") return "sets"
  if (line === "Create time permissions:") return "create"
  if (line === "Local permissions:") return "local"
  if (line === "Descendent permissions:") return "descendant"
  if (line === "Local+Descendent permissions:") return "local+descendant"
  return undefined
}

/** Parse `zfs allow <dataset>` text. OpenZFS prints "Descendent" (one e). */
export const parseAllowStdout = (stdout: string): ReadonlyArray<ParsedAllowListing> => {
  const listings: Array<{
    setpoint: string
    sets: Array<ParsedAllowSet>
    create: Array<string>
    grants: Array<ParsedAllowGrant>
  }> = []
  let current: typeof listings[number] | undefined
  let section: Section | undefined

  for (const raw of stdout.split(/\r?\n/)) {
    const header = headerRe.exec(raw)
    if (header) {
      const setpoint = (header[1] ?? "").trim()
      current = { setpoint, sets: [], create: [], grants: [] }
      listings.push(current)
      section = undefined
      continue
    }
    const labeled = sectionOf(raw.trim())
    if (labeled !== undefined) {
      section = labeled
      continue
    }
    if (current === undefined || section === undefined) continue
    const body = raw.trim()
    if (body.length === 0) continue
    if (section === "sets") {
      const set = parseSetLine(body)
      if (set) current.sets.push(set)
      continue
    }
    if (section === "create") {
      current.create.push(...tokens(body))
      continue
    }
    const grant = parseUge(body, section)
    if (grant) current.grants.push(grant)
  }

  return listings
}

export const inheritFlags = (inherit: DelegInherit | undefined): ReadonlyArray<string> => {
  if (inherit === "local") return ["-l"]
  if (inherit === "descendant") return ["-d"]
  return []
}

export const whoArgv = (kind: DelegWhoKind, name: string | undefined): ReadonlyArray<string> => {
  switch (kind) {
    case "user":
      return name === undefined ? ["-u"] : ["-u", name]
    case "group":
      return name === undefined ? ["-g"] : ["-g", name]
    case "everyone":
      return ["-e"]
    case "create":
      return ["-c"]
    case "set":
      return name === undefined ? ["-s"] : ["-s", name]
  }
}
