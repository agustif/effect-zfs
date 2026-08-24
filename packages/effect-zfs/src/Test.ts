import type { Layer } from "effect"
import { ZfsProtocol, type TestHandlers } from "./Protocol.js"

export type { TestHandlers }

export const layer = (handlers: TestHandlers = {}): Layer.Layer<ZfsProtocol> =>
  ZfsProtocol.testLayer(handlers)
