import { CancelController, EventStream } from "@bananaseed/event_stream"
import { cloneMap } from "./util"

// Re-export core reactive stream classes so consumers don't need separate imports 
export { EventStream, CancelController } from "@bananaseed/event_stream"

export type Handler<A,Payload> = (app: A, payload: Payload, id: symbol) => void

type VoidHandler<A> = (app: A) => void
type StreamHandlerPair<A,Payload> = [stream: EventStream<Payload>, handler: Handler<A,Payload>]

interface AppShared<State,Context,TriggerMap extends Record<string,any>> {
  bind<T>(eventStream: EventStream<T>, handler: Handler<App<State,Context,TriggerMap>,T>): symbol
  bind<K extends keyof TriggerMap>(triggerId: K, handler: Handler<App<State,Context,TriggerMap>,TriggerMap[K]>): symbol
  onStop(handler: (app: App<State,Context,TriggerMap>) => void): symbol
}

export interface Builder<
  State,
  Context,
  TriggerMap extends Record<string,any>
> extends AppShared<State,Context,TriggerMap> {
  onStart(handler: (app: App<State,Context,TriggerMap>) => void): void
  start(initialState: State): Promise<State>
}
export interface App<
  State,
  Context,
  TriggerMap extends Record<string,any>
> extends AppShared<State,Context,TriggerMap> {
  readonly context: Context
  state: State

  trigger<K extends keyof TriggerMap>(
    ...args: TriggerMap[K] extends void
      ? [triggerId: K]
      : [triggerId: K, payload: TriggerMap[K]]
  ): void
  unbind(id: symbol): boolean
  unbind<K extends keyof TriggerMap>(triggerId: K, id: symbol): boolean
  stop(): void
}

class _Builder<State,Context,TriggerMap extends Record<string,any>> implements Builder<State,Context,TriggerMap> {
  private triggerHandlers: Map<keyof TriggerMap, Map<symbol, Handler<App<State,Context,TriggerMap>,any>>> = new Map()
  private onStartHandlers: Set<VoidHandler<App<State,Context,TriggerMap>>> = new Set()
  private onStopHandlers: Map<symbol, VoidHandler<App<State,Context,TriggerMap>>> = new Map()
  private eventHandlers: Map<symbol, StreamHandlerPair<App<State,Context,TriggerMap>,any>> = new Map()
  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  private bindEventStream<T>(eventStream: EventStream<T>, handler: Handler<App<State,Context,TriggerMap>,T>): symbol {
    const id = Symbol()
    this.eventHandlers.set(id, [eventStream, handler])
    return id
  }
  private bindTriggerHandler<K extends keyof TriggerMap>(triggerId: K, handler: Handler<App<State,Context,TriggerMap>, TriggerMap[K]>): symbol {
    const id = Symbol()
    if (!this.triggerHandlers.has(triggerId)) {
      this.triggerHandlers.set(triggerId, new Map())
    }
    this.triggerHandlers.get(triggerId)!.set(id, handler)
    return id
  }

  bind<T>(eventStream: EventStream<T>, handler: Handler<App<State,Context,TriggerMap>,T>): symbol
  bind<K extends keyof TriggerMap>(triggerId: K, handler: Handler<App<State,Context,TriggerMap>,TriggerMap[K]>): symbol
  bind(a: any, b: any): symbol {
    return typeof a === "string"
      ? this.bindTriggerHandler(a,b)
      : this.bindEventStream(a,b)
  }
  onStart(handler: (app: App<State,Context,TriggerMap>) => void): void {
    this.onStartHandlers.add(handler)
  }
  onStop(handler: (app: App<State,Context,TriggerMap>) => void): symbol {
    const id = Symbol()
    this.onStopHandlers.set(id, handler)
    return id
  }

  start(initialState: State): Promise<State> {
    return new Promise((resolve) => {
      const _runtime = new _App<State,Context,TriggerMap>({
        initialState,
        context: this.ctx,
        handlers: {
          triggerHandlers: this.triggerHandlers,
          onStartHandlers: this.onStartHandlers,
          onStopHandlers: this.onStopHandlers,
          eventHandlers: this.eventHandlers
        },
        resolve
      })
    })
  }
}

type HandlerMap<State,Context,TriggerMap extends Record<string,any>> = {
  triggerHandlers: Map<keyof TriggerMap, Map<symbol, Handler<App<State,Context,TriggerMap>,any>>>
  onStartHandlers: Set<VoidHandler<App<State,Context,TriggerMap>>>
  onStopHandlers: Map<symbol, VoidHandler<App<State,Context,TriggerMap>>>
  eventHandlers: Map<symbol, StreamHandlerPair<App<State,Context,TriggerMap>,any>>
}
type AppParameters<State,Context,TriggerMap extends Record<string,any>> = {
  initialState: State
  context: Context
  handlers: HandlerMap<State,Context,TriggerMap>
  resolve: (finalState: State) => void
}
class _App<State,Context,TriggerMap extends Record<string,any>> implements App<State,Context,TriggerMap> {
  readonly context: Context
  state: State

  private triggerHandlers: Map<keyof TriggerMap, Map<symbol, Handler<App<State,Context,TriggerMap>,any>>>
  private onStopHandlers: Map<symbol, VoidHandler<App<State,Context,TriggerMap>>>

  private cancelControllers: Map<symbol, CancelController> = new Map()

  private resolve: (finalState: State) => void

  private bindEventStream<T>(eventStream: EventStream<T>, handler: Handler<App<State,Context,TriggerMap>,T>, id: symbol = Symbol()): symbol {
    const cancelController = eventStream.listen(payload => handler(this, payload, id))
    this.cancelControllers.set(id, cancelController)
    return id
  }
  private bindTriggerHandler<K extends keyof TriggerMap>(triggerId: K, handler: Handler<App<State,Context,TriggerMap>, TriggerMap[K]>): symbol {
    const id = Symbol()
    if (!this.triggerHandlers.has(triggerId)) {
      this.triggerHandlers.set(triggerId, new Map())
    }
    this.triggerHandlers.get(triggerId)!.set(id, handler)
    return id
  }

  constructor(parameters: AppParameters<State,Context,TriggerMap>) {
    this.state = parameters.initialState
    this.context = parameters.context
    this.triggerHandlers = cloneMap(parameters.handlers.triggerHandlers)
    this.onStopHandlers = cloneMap(parameters.handlers.onStopHandlers)
    this.resolve = parameters.resolve
    
    // Run onStart handlers
    for (const handler of parameters.handlers.onStartHandlers.values()) {
      handler(this)
    }
    // Bind event handlers
    for (const [id, [stream, handler]] of parameters.handlers.eventHandlers.entries()) {
      this.bindEventStream(stream, handler, id)
    }
  }

  trigger(triggerId: any, payload?: any): void {
    const handlers = this.triggerHandlers.get(triggerId)
    if (handlers) {
      for (const [id, handler] of handlers.entries()) {
        handler(this, payload, id)
      }
    }
  }
  bind<T>(eventStream: EventStream<T>, handler: Handler<App<State,Context,TriggerMap>, T>): symbol
  bind<K extends keyof TriggerMap>(triggerId: K, handler: Handler<App<State,Context,TriggerMap>, TriggerMap[K]>): symbol
  bind(a: any, b: any): symbol {
    return typeof a === "string"
      ? this.bindTriggerHandler(a,b)
      : this.bindEventStream(a,b)
  }
  onStop(handler: (app: App<State, Context, TriggerMap>) => void): symbol {
    const id = Symbol()
    this.onStopHandlers.set(id, handler)
    return id
  }

  unbind(id: symbol): boolean
  unbind<K extends keyof TriggerMap>(triggerId: K, id: symbol): boolean
  unbind(a: any, b?: any): boolean {
    if (b === undefined) {
      // Unbind event handler
      const cancelController = this.cancelControllers.get(a)
      if (cancelController) {
        cancelController.cancel()
        this.cancelControllers.delete(a)
        return true
      }
      // Unbind onStop handler
      else if (this.onStopHandlers.has(a)) {
        this.onStopHandlers.delete(a)
        return true
      }
      else return false
    }
    else {
      // Unbind trigger handler
      const handlers = this.triggerHandlers.get(a)
      if (handlers && handlers.has(b)) return handlers.delete(b)
      else return false
    }
  }

  stop(): void {
    // Run onStop handlers
    for (const handler of this.onStopHandlers.values()) {
      handler(this)
    }
    this.onStopHandlers.clear()
    // Cancel event handlers
    for (const cancelController of this.cancelControllers.values()) {
      cancelController.cancel()
    }
    this.cancelControllers.clear()
    this.resolve(this.state)
  }
}

export function createApp<State,TriggerMap extends Record<string,any> = {}>(): Builder<State,void,TriggerMap>
export function createApp<State,Context,TriggerMap extends Record<string,any> = {}>(context: Context): Builder<State,Context,TriggerMap> 
export function createApp(c?: any){
  return new _Builder(c)
}
export default {
  createApp
}