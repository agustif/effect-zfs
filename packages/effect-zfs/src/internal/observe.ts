import { Stream } from "effect"
import {
  EventsCleared,
  HistoryRecord,
  IostatRow,
  IostatSample,
  PoolEvent
} from "../Args.js"
import { byteCount } from "../Limits.js"
import { poolName, poolWhy } from "../Name.js"

const isDigits = (value: string) => {
  if (value.length === 0) return false
  for (const c of value) {
    if (c < "0" || c > "9") return false
  }
  return true
}

const parseByte = (raw: string) => {
  const token = raw === "-" ? "0" : raw
  if (!isDigits(token)) return undefined
  try {
    return byteCount(BigInt(token))
  } catch {
    return undefined
  }
}

const unquote = (value: string) => {
  const trimmed = value.trim()
  if (trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
    return trimmed.slice(1, -1)
  }
  const quoted = /^"(.*)"(?:\s+\(.*\))?$/.exec(trimmed)
  return quoted?.[1] ?? trimmed
}

export const parseIostatRow = (line: string): IostatRow | undefined => {
  const columns = line.split("\t")
  if (columns.length < 7) return undefined
  const name = columns[0]
  const allocated = parseByte(columns[1] ?? "")
  const free = parseByte(columns[2] ?? "")
  const readOps = parseByte(columns[3] ?? "")
  const writeOps = parseByte(columns[4] ?? "")
  const readBytes = parseByte(columns[5] ?? "")
  const writeBytes = parseByte(columns[6] ?? "")
  if (
    name === undefined || name.length === 0 ||
    allocated === undefined || free === undefined ||
    readOps === undefined || writeOps === undefined ||
    readBytes === undefined || writeBytes === undefined
  ) {
    return undefined
  }
  return new IostatRow({ name, allocated, free, readOps, writeOps, readBytes, writeBytes })
}

export const parseIostatTimestamp = (line: string): bigint | undefined => {
  const token = line.trim()
  const whole = token.includes(".") ? token.slice(0, token.indexOf(".")) : token
  if (!isDigits(whole)) return undefined
  try {
    return BigInt(whole)
  } catch {
    return undefined
  }
}

export const parseEventHeader = (line: string): { readonly time: string; readonly eventClass: string } | undefined => {
  if (line.length === 0 || line.startsWith(" ") || line.startsWith("\t")) return undefined
  if (/^dropped \d+ events$/i.test(line.trim())) return undefined
  if (/^TIME\b/.test(line) && /\bCLASS\b/.test(line)) return undefined
  const tab = line.indexOf("\t")
  if (tab > 0) {
    const time = line.slice(0, tab).trim()
    const eventClass = line.slice(tab + 1).trim()
    if (time.length === 0 || eventClass.length === 0) return undefined
    return { time, eventClass }
  }
  const classAt = line.search(/\S+\.\S+\.\S+/)
  if (classAt <= 0) return undefined
  const time = line.slice(0, classAt).trim()
  const eventClass = line.slice(classAt).trim()
  if (time.length === 0 || eventClass.length === 0) return undefined
  return { time, eventClass }
}

export const parseEventPayloadLine = (line: string): { readonly name: string; readonly value: string } | undefined => {
  const match = /^[ \t]+(\S+)\s+=\s+(.*)$/.exec(line)
  if (!match) return undefined
  const name = match[1]
  const value = match[2]
  if (name === undefined || value === undefined) return undefined
  return { name, value: unquote(value) }
}

const poolFromPayload = (payload: { readonly [key: string]: string }) => {
  const value = payload["pool"]
  if (value === undefined || poolWhy(value) !== undefined) return {}
  return { pool: poolName(value) }
}

const toEvent = (
  time: string,
  eventClass: string,
  payload: { readonly [key: string]: string }
) =>
  new PoolEvent({
    time,
    eventClass,
    payload,
    ...poolFromPayload(payload)
  })

export const parseEventsCleared = (stdout: string): EventsCleared => {
  const match = /cleared\s+(\d+)\s+events/i.exec(stdout)
  const raw = match?.[1] ?? "0"
  return new EventsCleared({ dropped: Number(raw) })
}

const longHistory = /^(.*) \[user \d+(?: \(([^)]+)\))? on ([^:\]]+)(?::([^\]]+))?\]$/

export const parseHistoryRecord = (line: string): HistoryRecord | undefined => {
  const trimmed = line.trim()
  if (trimmed.length === 0) return undefined
  if (trimmed.startsWith("History for ")) return undefined
  const match = /^(\d{4}-\d{2}-\d{2}\.\d{2}:\d{2}:\d{2})(?: \(\d+ms\))? (.*)$/.exec(trimmed)
  if (!match) return undefined
  const time = match[1]
  const rest = match[2]
  if (time === undefined || rest === undefined) return undefined
  const long = longHistory.exec(rest)
  const command = long?.[1] ?? rest
  const user = long?.[2]
  const hostname = long?.[3]
  const zone = long?.[4]
  const internal = command.includes("[internal ") || command.startsWith("[txg:") || command.includes(" ioctl ")
  return new HistoryRecord({
    time,
    command,
    internal,
    ...(user === undefined || user.length === 0 ? {} : { user }),
    ...(hostname === undefined || hostname.length === 0 ? {} : { hostname }),
    ...(zone === undefined || zone.length === 0 ? {} : { zone })
  })
}

type EventState = {
  readonly time: string
  readonly eventClass: string
  readonly payload: { readonly [key: string]: string }
} | undefined

export const eventsFromLines = <E, R>(lines: Stream.Stream<string, E, R>): Stream.Stream<PoolEvent, E, R> =>
  lines.pipe(
    Stream.mapAccum(
      (): EventState => undefined,
      (current, line) => {
        const header = parseEventHeader(line)
        if (header) {
          const emitted: ReadonlyArray<PoolEvent> = current === undefined
            ? []
            : [toEvent(current.time, current.eventClass, current.payload)]
          const next: EventState = { time: header.time, eventClass: header.eventClass, payload: {} }
          return [next, emitted]
        }
        const field = parseEventPayloadLine(line)
        if (field && current !== undefined) {
          const payload: { readonly [key: string]: string } = { ...current.payload, [field.name]: field.value }
          const next: EventState = { time: current.time, eventClass: current.eventClass, payload }
          return [next, []]
        }
        return [current, []]
      },
      {
        onHalt: (current) =>
          current === undefined ? [] : [toEvent(current.time, current.eventClass, current.payload)]
      }
    )
  )

type IostatState = {
  readonly timestamp: bigint | undefined
  readonly rows: ReadonlyArray<IostatRow>
}

const emitIostat = (state: IostatState): ReadonlyArray<IostatSample> => {
  if (state.rows.length === 0) return []
  return [new IostatSample({
    rows: state.rows,
    ...(state.timestamp === undefined ? {} : { timestamp: state.timestamp })
  })]
}

export const iostatFromLines = <E, R>(lines: Stream.Stream<string, E, R>): Stream.Stream<IostatSample, E, R> =>
  lines.pipe(
    Stream.mapAccum(
      (): IostatState => ({ timestamp: undefined, rows: [] }),
      (state, line) => {
        const trimmed = line.trim()
        if (trimmed.length === 0) {
          return [{ timestamp: undefined, rows: [] }, emitIostat(state)]
        }
        const timestamp = parseIostatTimestamp(trimmed)
        if (timestamp !== undefined) {
          return [{ timestamp, rows: [] }, emitIostat(state)]
        }
        const row = parseIostatRow(line)
        if (row === undefined) return [state, []]
        const next: IostatState = { timestamp: state.timestamp, rows: [...state.rows, row] }
        return [next, []]
      },
      { onHalt: emitIostat }
    )
  )

export const historyFromLines = <E, R>(lines: Stream.Stream<string, E, R>): Stream.Stream<HistoryRecord, E, R> =>
  lines.pipe(
    Stream.mapAccum(
      (): undefined => undefined,
      (_state, line) => {
        const record = parseHistoryRecord(line)
        return [undefined, record === undefined ? [] : [record]]
      }
    )
  )
