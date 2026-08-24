declare module "effect" {
  export namespace Fiber {
    export interface Fiber<out A, out E = never> {}
    export const join: any
  }
  export namespace Effect {
    export interface Effect<out A, out E = never, out R = never> {
      pipe: (...fns: any[]) => any
      [Symbol.iterator](): Generator<any, A, any>
    }
    export const gen: <A>(f: () => Generator<any, A, any>) => Effect<A, any, any>
    export const map: any
    export const mapError: any
    export const fail: <E>(e: E) => Effect<never, E>
    export const succeed: <A>(a: A) => Effect<A>
    export const as: any
    export const asVoid: any
    export const all: any
    export const scoped: any
    export const forEach: any
    export const forkScoped: any
  }
  export namespace Stream {
    export interface Stream<out A, out E = never, out R = never> { pipe: (...fns: any[]) => any }
    export const decodeText: any
    export const mkString: any
    export const unwrap: any
    export const fromEffect: any
    export const filter: any
    export const concat: any
    export const run: any
    export const mapError: any
    export const empty: Stream<never>
  }
  export namespace Layer {
    export interface Layer<out A, out E = never, out R = never> {}
    export const effect: any
    export const succeed: any
  }
  export namespace Context {
    export interface ServiceShape<Shape> extends Effect.Effect<Shape, never, any> {
      of(self: Shape): Shape
    }
    export function Service<Self, Shape>(): (id: string) => {
      new(_: never): {}
      readonly Service: Shape
      of(self: Shape): Shape
      pipe: (...fns: any[]) => any
      [Symbol.iterator](): Generator<any, Shape, any>
    }
  }
  export namespace Data {
    export const TaggedError: <Tag extends string>(tag: Tag) => new<A extends Record<string, any> = {}>(args: A) => Readonly<A> & { readonly _tag: Tag }
  }
  export namespace Schema {
    export const String: any
    export const BigInt: any
    export const BigIntFromString: any
    export const Literals: any
    export const Struct: any
    export const optional: any
  }
}

declare module "effect/unstable/process" {
  import type { Effect, Stream } from "effect"
  export namespace ChildProcess {
    export const make: any
  }
  export namespace ChildProcessSpawner {
    export interface ChildProcessSpawner {
      spawn(command: any): Effect.Effect<{
        stdout: Stream.Stream<Uint8Array, unknown>
        stderr: Stream.Stream<Uint8Array, unknown>
        exitCode: Effect.Effect<number, unknown>
        stdin: any
      }, unknown, any>
    }
    export const ChildProcessSpawner: ChildProcessSpawner & Effect.Effect<ChildProcessSpawner>
  }
}
