const unescape = (token) => token.replaceAll("~1", "/").replaceAll("~0", "~")

const pointerTokens = (path) => {
  if (path === "") return []
  if (!path.startsWith("/")) throw new Error(`invalid JSON pointer: ${path}`)
  return path.slice(1).split("/").map(unescape)
}

const clone = (value) => structuredClone(value)

const at = (document, tokens) => {
  let current = document
  for (const token of tokens) {
    if (current == null) return undefined
    current = Array.isArray(current) ? current[Number(token)] : current[token]
  }
  return current
}

const parentAndKey = (document, path) => {
  const tokens = pointerTokens(path)
  if (tokens.length === 0) return { parent: document, key: undefined, tokens }
  const key = tokens[tokens.length - 1]
  const parent = at(document, tokens.slice(0, -1))
  if (parent == null || (typeof parent !== "object")) {
    throw new Error(`json patch path not found: ${path}`)
  }
  return { parent, key, tokens }
}

const removeAt = (parent, key) => {
  if (Array.isArray(parent)) {
    const index = Number(key)
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
      throw new Error(`json patch array index out of range: ${key}`)
    }
    return parent.splice(index, 1)[0]
  }
  if (!(key in parent)) throw new Error(`json patch missing member: ${key}`)
  const value = parent[key]
  delete parent[key]
  return value
}

const addAt = (parent, key, value) => {
  if (Array.isArray(parent)) {
    if (key === "-") {
      parent.push(value)
      return
    }
    const index = Number(key)
    if (!Number.isInteger(index) || index < 0 || index > parent.length) {
      throw new Error(`json patch array index out of range: ${key}`)
    }
    parent.splice(index, 0, value)
    return
  }
  parent[key] = value
}

/** RFC 6902 JSON Patch. Mutates a clone; the input document is left unchanged. */
export const applyJsonPatch = (document, operations) => {
  const target = clone(document)
  if (!Array.isArray(operations) || operations.length === 0) return target
  for (const operation of operations) {
    const op = operation?.op
    if (op === "add") {
      const { key, parent } = parentAndKey(target, operation.path)
      if (key === undefined) throw new Error("json patch add cannot replace the document root")
      addAt(parent, key, clone(operation.value))
    } else if (op === "remove") {
      const { key, parent } = parentAndKey(target, operation.path)
      if (key === undefined) throw new Error("json patch remove cannot target the document root")
      removeAt(parent, key)
    } else if (op === "replace") {
      const { key, parent } = parentAndKey(target, operation.path)
      if (key === undefined) throw new Error("json patch replace cannot target the document root")
      removeAt(parent, key)
      addAt(parent, key, clone(operation.value))
    } else if (op === "move") {
      const from = parentAndKey(target, operation.from)
      if (from.key === undefined) throw new Error("json patch move cannot take the document root")
      const value = removeAt(from.parent, from.key)
      const to = parentAndKey(target, operation.path)
      if (to.key === undefined) throw new Error("json patch move cannot replace the document root")
      addAt(to.parent, to.key, value)
    } else if (op === "copy") {
      const value = at(target, pointerTokens(operation.from))
      if (value === undefined) throw new Error(`json patch copy from missing: ${operation.from}`)
      const to = parentAndKey(target, operation.path)
      if (to.key === undefined) throw new Error("json patch copy cannot replace the document root")
      addAt(to.parent, to.key, clone(value))
    } else if (op === "test") {
      const value = at(target, pointerTokens(operation.path))
      if (JSON.stringify(value) !== JSON.stringify(operation.value)) {
        throw new Error(`json patch test failed: ${operation.path}`)
      }
    } else {
      throw new Error(`unsupported json patch op: ${op}`)
    }
  }
  return target
}
