import type { EncodedProperty } from "../args/index.js"

type KoffiLib = {
  readonly func: (signature: string) => (...args: Array<unknown>) => unknown
  readonly symbol?: (name: string) => unknown
}

type Koffi = {
  readonly load: (name: string) => KoffiLib
  readonly decode?: (value: unknown, ...rest: Array<unknown>) => unknown
  readonly array?: (type: string | unknown, length: number) => unknown
  readonly pointer?: (ref: string | unknown) => unknown
  readonly view?: (ref: unknown, len: number) => ArrayBuffer
  readonly as?: (value: unknown, type: string | unknown) => unknown
  readonly sizeof?: (type: unknown) => number
}

export type NvValue = string | bigint | boolean | NvObject | ReadonlyArray<NvObject> | ReadonlyArray<bigint>
export type NvObject = { readonly [key: string]: NvValue }

export type NvpairFns = {
  readonly alloc: () => unknown
  readonly free: (ptr: unknown) => void
  readonly addString: (ptr: unknown, name: string, value: string) => void
  readonly addBoolean: (ptr: unknown, name: string) => void
  readonly addBooleanValue: (ptr: unknown, name: string, value: boolean) => void
  readonly addUint64: (ptr: unknown, name: string, value: bigint) => void
  readonly addInt32: (ptr: unknown, name: string, value: number) => void
  readonly addNvlist: (ptr: unknown, name: string, child: unknown) => void
  readonly addStringArray: (ptr: unknown, name: string, values: ReadonlyArray<string>) => void
  readonly addNvlistArray: (ptr: unknown, name: string, children: ReadonlyArray<unknown>) => void
  readonly lookupNvlist: (ptr: unknown, name: string) => unknown | undefined
  readonly lookupString: (ptr: unknown, name: string) => string | undefined
  readonly lookupUint64: (ptr: unknown, name: string) => bigint | undefined
  readonly lookupNvlistArray: (ptr: unknown, name: string) => ReadonlyArray<unknown>
  readonly lookupUint64Array: (ptr: unknown, name: string) => ReadonlyArray<bigint>
  readonly unpack: (ptr: unknown) => NvObject
}

const DATA_BOOLEAN = 1
const DATA_INT32 = 5
const DATA_INT64 = 7
const DATA_UINT64 = 8
const DATA_STRING = 9
const DATA_UINT64_ARRAY = 16
const DATA_NVLIST = 19
const DATA_NVLIST_ARRAY = 20
const DATA_BOOLEAN_VALUE = 21

const tryLoad = (koffi: Koffi, name: string): KoffiLib | undefined => {
  try {
    return koffi.load(name)
  } catch {
    return undefined
  }
}

const asBigint = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}

/** libnvpair `fnvlist_*` helpers plus unpack. Missing library returns undefined. */
export const loadNvpair = (koffi: Koffi): NvpairFns | undefined => {
  const lib = tryLoad(koffi, "libnvpair.so.3") ?? tryLoad(koffi, "libnvpair.so.1") ?? tryLoad(koffi, "libnvpair.so")
  if (lib === undefined) return undefined
  const tryFunc = (signature: string) => {
    try {
      return lib.func(signature)
    } catch {
      return undefined
    }
  }
  const alloc = tryFunc("void *fnvlist_alloc()")
  const free = tryFunc("void fnvlist_free(void *nvl)")
  const addString = tryFunc("void fnvlist_add_string(void *nvl, const char *name, const char *value)")
  const addBoolean = tryFunc("void fnvlist_add_boolean(void *nvl, const char *name)")
  const addBooleanValue = tryFunc("void fnvlist_add_boolean_value(void *nvl, const char *name, int value)")
  const addUint64 = tryFunc("void fnvlist_add_uint64(void *nvl, const char *name, uint64_t value)")
  const addInt32 = tryFunc("void fnvlist_add_int32(void *nvl, const char *name, int32_t value)")
  const addNvlist = tryFunc("void fnvlist_add_nvlist(void *nvl, const char *name, void *child)")
  const addStringArray = tryFunc(
    "void fnvlist_add_string_array(void *nvl, const char *name, void **values, uint32_t n)"
  )
  const addNvlistArray = tryFunc(
    "void fnvlist_add_nvlist_array(void *nvl, const char *name, void **children, uint32_t n)"
  )
  const next = tryFunc("void *nvlist_next_nvpair(void *nvl, void *nvp)")
  const pairName = tryFunc("const char *nvpair_name(void *nvp)")
  const pairType = tryFunc("int nvpair_type(void *nvp)")
  const valueString = tryFunc("int nvpair_value_string(void *nvp, _Out_ char **val)")
  const valueUint64 = tryFunc("int nvpair_value_uint64(void *nvp, _Out_ uint64_t *val)")
  const valueInt64 = tryFunc("int nvpair_value_int64(void *nvp, _Out_ int64_t *val)")
  const valueInt32 = tryFunc("int nvpair_value_int32(void *nvp, _Out_ int32_t *val)")
  const valueNvlist = tryFunc("int nvpair_value_nvlist(void *nvp, _Out_ void **val)")
  const valueBoolean = tryFunc("int nvpair_value_boolean_value(void *nvp, _Out_ int *val)")
  const lookupNvlistFn = tryFunc("int nvlist_lookup_nvlist(void *nvl, const char *name, _Out_ void **val)")
  const lookupStringFn = tryFunc("int nvlist_lookup_string(void *nvl, const char *name, _Out_ char **val)")
  const lookupUint64Fn = tryFunc("int nvlist_lookup_uint64(void *nvl, const char *name, _Out_ uint64_t *val)")
  const lookupNvlistArrayFn = tryFunc(
    "int nvlist_lookup_nvlist_array(void *nvl, const char *name, _Out_ void **arr, _Out_ uint32_t *n)"
  )
  const lookupUint64ArrayFn = tryFunc(
    "int nvlist_lookup_uint64_array(void *nvl, const char *name, _Out_ void **arr, _Out_ uint32_t *n)"
  )
  const valueNvlistArray = tryFunc("int nvpair_value_nvlist_array(void *nvp, _Out_ void **arr, _Out_ uint32_t *n)")
  const valueUint64Array = tryFunc("int nvpair_value_uint64_array(void *nvp, _Out_ void **arr, _Out_ uint32_t *n)")
  const readPointerArray = (base: unknown, count: number): ReadonlyArray<unknown> => {
    if (base === null || base === undefined || count <= 0) return []
    if (koffi.decode === undefined) return []
    const ptrSize = koffi.sizeof === undefined ? 8 : koffi.sizeof("void *")
    const out: Array<unknown> = []
    for (let i = 0; i < count; i++) {
      try {
        const child = koffi.decode(base, i * ptrSize, "void *")
        if (child !== null && child !== undefined && child !== 0 && child !== 0n) out.push(child)
      } catch {
        break
      }
    }
    return out
  }
  const readUint64Array = (base: unknown, count: number): ReadonlyArray<bigint> => {
    if (base === null || base === undefined || count <= 0) return []
    if (koffi.decode === undefined) return []
    const out: Array<bigint> = []
    for (let i = 0; i < count; i++) {
      try {
        out.push(asBigint(koffi.decode(base, i * 8, "uint64_t")))
      } catch {
        break
      }
    }
    return out
  }
  const pairNvlistArray = (pair: unknown): ReadonlyArray<unknown> => {
    if (valueNvlistArray === undefined) return []
    const arr: Array<unknown> = [null]
    const n: Array<unknown> = [0]
    if (Number(valueNvlistArray(pair, arr, n)) !== 0) return []
    return readPointerArray(arr[0], Number(n[0]))
  }
  const pairUint64Array = (pair: unknown): ReadonlyArray<bigint> => {
    if (valueUint64Array === undefined) return []
    const arr: Array<unknown> = [null]
    const n: Array<unknown> = [0]
    if (Number(valueUint64Array(pair, arr, n)) !== 0) return []
    return readUint64Array(arr[0], Number(n[0]))
  }
  if (
    alloc === undefined ||
    free === undefined ||
    addString === undefined ||
    addBoolean === undefined ||
    addUint64 === undefined ||
    addNvlist === undefined ||
    next === undefined ||
    pairName === undefined ||
    pairType === undefined
  ) return undefined

  const unpack = (ptr: unknown): NvObject => {
    const out: { [key: string]: NvValue } = {}
    let pair: unknown = null
    for (;;) {
      pair = next(ptr, pair)
      if (pair === null || pair === undefined || pair === 0) break
      const key = String(pairName(pair) ?? "")
      if (key.length === 0) continue
      const kind = Number(pairType(pair))
      if (kind === DATA_BOOLEAN) {
        out[key] = true
        continue
      }
      if (kind === DATA_UINT64 && valueUint64 !== undefined) {
        const slot: Array<unknown> = [0n]
        if (Number(valueUint64(pair, slot)) === 0) out[key] = asBigint(slot[0])
        continue
      }
      if (kind === DATA_INT64 && valueInt64 !== undefined) {
        const slot: Array<unknown> = [0n]
        if (Number(valueInt64(pair, slot)) === 0) out[key] = asBigint(slot[0])
        continue
      }
      if (kind === DATA_INT32 && valueInt32 !== undefined) {
        const slot: Array<unknown> = [0]
        if (Number(valueInt32(pair, slot)) === 0) out[key] = asBigint(slot[0])
        continue
      }
      if (kind === DATA_STRING && valueString !== undefined) {
        const slot: Array<unknown> = [null]
        if (Number(valueString(pair, slot)) === 0 && slot[0] !== null && slot[0] !== undefined) {
          out[key] = String(slot[0])
        }
        continue
      }
      if (kind === DATA_NVLIST && valueNvlist !== undefined) {
        const slot: Array<unknown> = [null]
        if (Number(valueNvlist(pair, slot)) === 0 && slot[0] !== null && slot[0] !== undefined) {
          out[key] = unpack(slot[0])
        }
        continue
      }
      if (kind === DATA_NVLIST_ARRAY) {
        out[key] = pairNvlistArray(pair).map((child) => unpack(child))
        continue
      }
      if (kind === DATA_UINT64_ARRAY) {
        out[key] = pairUint64Array(pair)
        continue
      }
      if (kind === DATA_BOOLEAN_VALUE && valueBoolean !== undefined) {
        const slot: Array<unknown> = [0]
        if (Number(valueBoolean(pair, slot)) === 0) out[key] = Number(slot[0]) !== 0
      }
    }
    return out
  }

  return {
    alloc: () => {
      const ptr = alloc()
      if (ptr === null || ptr === undefined || ptr === 0) {
        throw new Error("fnvlist_alloc returned null")
      }
      return ptr
    },
    free: (ptr) => {
      if (ptr !== null && ptr !== undefined) free(ptr)
    },
    addString: (ptr, name, value) => addString(ptr, name, value),
    addBoolean: (ptr, name) => addBoolean(ptr, name),
    addBooleanValue: (ptr, name, value) => {
      if (addBooleanValue === undefined) addBoolean(ptr, name)
      else addBooleanValue(ptr, name, value ? 1 : 0)
    },
    addUint64: (ptr, name, value) => addUint64(ptr, name, value),
    addInt32: (ptr, name, value) => {
      if (addInt32 !== undefined) addInt32(ptr, name, value)
      else addUint64(ptr, name, BigInt(value))
    },
    addNvlist: (ptr, name, child) => addNvlist(ptr, name, child),
    addStringArray: (ptr, name, values) => {
      if (addStringArray === undefined) {
        throw new Error("fnvlist_add_string_array is not available")
      }
      addStringArray(ptr, name, [...values], values.length)
    },
    addNvlistArray: (ptr, name, children) => {
      if (addNvlistArray === undefined) {
        throw new Error("fnvlist_add_nvlist_array is not available")
      }
      addNvlistArray(ptr, name, [...children], children.length)
    },
    lookupNvlist: (ptr, name) => {
      if (lookupNvlistFn !== undefined) {
        const slot: Array<unknown> = [null]
        if (Number(lookupNvlistFn(ptr, name, slot)) === 0) {
          const child = slot[0]
          if (child !== null && child !== undefined && child !== 0 && child !== 0n) return child
        }
      }
      // `zpool_search_import` allocates the pool map with flags 0 (not
      // NV_UNIQUE_NAME), so nvlist_lookup_* misses keys that nvlist_next_nvpair sees.
      if (valueNvlist === undefined) return undefined
      let pair: unknown = null
      for (;;) {
        pair = next(ptr, pair)
        if (pair === null || pair === undefined || pair === 0) break
        if (String(pairName(pair) ?? "") !== name) continue
        if (Number(pairType(pair)) !== DATA_NVLIST) continue
        const slot: Array<unknown> = [null]
        if (Number(valueNvlist(pair, slot)) !== 0) continue
        const child = slot[0]
        if (child !== null && child !== undefined && child !== 0 && child !== 0n) return child
      }
      return undefined
    },
    lookupString: (ptr, name) => {
      if (lookupStringFn === undefined) return undefined
      const slot: Array<unknown> = [null]
      if (Number(lookupStringFn(ptr, name, slot)) !== 0) return undefined
      if (slot[0] === null || slot[0] === undefined) return undefined
      return String(slot[0])
    },
    lookupUint64: (ptr, name) => {
      if (lookupUint64Fn === undefined) return undefined
      const slot: Array<unknown> = [0n]
      if (Number(lookupUint64Fn(ptr, name, slot)) !== 0) return undefined
      return asBigint(slot[0])
    },
    lookupNvlistArray: (ptr, name) => {
      if (lookupNvlistArrayFn !== undefined) {
        const arr: Array<unknown> = [null]
        const n: Array<unknown> = [0]
        if (Number(lookupNvlistArrayFn(ptr, name, arr, n)) === 0) {
          return readPointerArray(arr[0], Number(n[0]))
        }
      }
      let pair: unknown = null
      for (;;) {
        pair = next(ptr, pair)
        if (pair === null || pair === undefined || pair === 0) break
        if (String(pairName(pair) ?? "") !== name) continue
        if (Number(pairType(pair)) !== DATA_NVLIST_ARRAY) continue
        return pairNvlistArray(pair)
      }
      return []
    },
    lookupUint64Array: (ptr, name) => {
      if (lookupUint64ArrayFn !== undefined) {
        const arr: Array<unknown> = [null]
        const n: Array<unknown> = [0]
        if (Number(lookupUint64ArrayFn(ptr, name, arr, n)) === 0) {
          return readUint64Array(arr[0], Number(n[0]))
        }
      }
      let pair: unknown = null
      for (;;) {
        pair = next(ptr, pair)
        if (pair === null || pair === undefined || pair === 0) break
        if (String(pairName(pair) ?? "") !== name) continue
        if (Number(pairType(pair)) !== DATA_UINT64_ARRAY) continue
        return pairUint64Array(pair)
      }
      return []
    },
    unpack
  }
}

export const nvlistFromProperties = (
  nv: NvpairFns,
  properties: ReadonlyArray<EncodedProperty> | undefined
): unknown | undefined => {
  if (properties === undefined || properties.length === 0) return undefined
  const ptr = nv.alloc()
  for (const row of properties) nv.addString(ptr, row.name, row.value)
  return ptr
}

export const nvlistBooleanKeys = (nv: NvpairFns, names: ReadonlyArray<string>): unknown => {
  const ptr = nv.alloc()
  for (const name of names) nv.addBoolean(ptr, name)
  return ptr
}

export const nvlistStringMap = (
  nv: NvpairFns,
  entries: ReadonlyArray<readonly [string, string]>
): unknown => {
  const ptr = nv.alloc()
  for (const [key, value] of entries) nv.addString(ptr, key, value)
  return ptr
}

export const nvlistGuidMap = (
  nv: NvpairFns,
  entries: ReadonlyArray<readonly [string, bigint]>
): unknown => {
  const ptr = nv.alloc()
  for (const [key, value] of entries) nv.addUint64(ptr, key, value)
  return ptr
}

const isNvRecord = (value: NvValue): value is NvObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const nestedValue = (row: NvValue | undefined): string => {
  if (row === undefined) return ""
  if (typeof row === "string") return row
  if (typeof row === "bigint") return row.toString()
  if (typeof row === "boolean") return row ? "on" : "off"
  if (Array.isArray(row)) {
    return row.map((item) => typeof item === "bigint" ? item.toString() : nestedValue(item)).join(",")
  }
  if (!isNvRecord(row)) return ""
  const inner = row["value"]
  if (inner === undefined) return ""
  if (typeof inner === "string") return inner
  if (typeof inner === "bigint") return inner.toString()
  if (typeof inner === "boolean") return inner ? "on" : "off"
  return ""
}

const nestedSource = (row: NvValue | undefined): string => {
  if (row === undefined || !isNvRecord(row)) return "-"
  const source = row["source"]
  if (typeof source === "string") return source
  if (typeof source !== "bigint") return "-"
  if ((source & 0x8n) !== 0n) return "local"
  if ((source & 0x10n) !== 0n) return "inherited"
  if ((source & 0x20n) !== 0n) return "received"
  if ((source & 0x4n) !== 0n) return "temporary"
  if ((source & 0x2n) !== 0n) return "default"
  return "-"
}

export const propertyRowsFromNvlist = (
  name: string,
  unpacked: NvObject,
  property?: string
): ReadonlyArray<
  { readonly name: string; readonly property: string; readonly value: string; readonly source: string }
> => {
  const keys = property === undefined || property === "all" ? Object.keys(unpacked) : [property]
  const rows: Array<{ name: string; property: string; value: string; source: string }> = []
  for (const key of keys) {
    const row = unpacked[key]
    if (row === undefined) continue
    rows.push({
      name,
      property: key,
      value: nestedValue(row),
      source: nestedSource(row)
    })
  }
  return rows
}

export const jsonFromNvObject = (value: NvObject): string =>
  JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item)
