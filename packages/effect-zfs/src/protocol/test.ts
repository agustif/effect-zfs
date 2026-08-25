import type { Layer } from "effect"
import { type TestHandlers, ZfsProtocol } from "./protocol.js"

export type { TestHandlers }

export const layer = (handlers: TestHandlers = {}): Layer.Layer<ZfsProtocol> => ZfsProtocol.testLayer(handlers)
