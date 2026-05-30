import { describe, it, expect } from "vitest"
import { createApp, EventStream } from "../src/index"
import { pushStream } from "@bananaseed/event_stream"

describe("Potassium Core Lifecycle", () => {
  it("should initialize a builder and configure event hooks", async () => {
    let stopHookCalled = false

    // Create a builder specifically for stopping
    const stopBuilder = createApp<{ count: number }>()
    stopBuilder.onStart((app) => {
      app.state.count = 20
      app.stop()
    })
    stopBuilder.onStop(() => {
      stopHookCalled = true
    })

    const finalState = await stopBuilder.start({ count: 10 })
    expect(stopHookCalled).toBe(true)
    expect(finalState).toEqual({ count: 20 })
  })

  it("should resolve the start promise with final state when stop is called", async () => {
    const builder = createApp<{ message: string }>()
    let appInstance: any = null

    builder.onStart((app) => {
      appInstance = app
    })

    const startPromise = builder.start({ message: "initial" })
    expect(appInstance).not.toBeNull()

    appInstance.state.message = "stopped"
    appInstance.stop()

    const finalState = await startPromise
    expect(finalState).toEqual({ message: "stopped" })
  })
})

describe("Potassium Context Sharing", () => {
  it("should inject and share context across handlers", async () => {
    const context = { apiBase: "https://api.example.com", counter: 0 }
    const builder = createApp<{ status: string }, typeof context, { ping: void }>(context)

    builder.onStart((app) => {
      expect(app.context.apiBase).toBe("https://api.example.com")
      app.context.counter++
    })

    builder.bind("ping", (app) => {
      app.context.counter++
      app.state.status = `pong-${app.context.counter}`
    })

    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    const startPromise = builder.start({ status: "idle" })
    expect(context.counter).toBe(1) // incremented in onStart

    appInstance.trigger("ping")
    expect(context.counter).toBe(2) // 1 (onStart) + 1 (ping handler)
    expect(appInstance.state.status).toBe("pong-2")

    appInstance.stop()
    await startPromise
  })
})

describe("Potassium Event Stream Bindings & Unbinding", () => {
  it("should bind event streams and propagate emissions to state", async () => {
    const [push, stream] = pushStream<number>()

    const builder = createApp<{ sum: number }>()
    builder.bind(stream, (app, val) => {
      app.state.sum += val
    })

    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    const startPromise = builder.start({ sum: 0 })

    push(5)
    push(10)
    expect(appInstance.state.sum).toBe(15)

    appInstance.stop()
    await startPromise
  })

  it("should support unbinding event stream subscriptions via returned symbol ID", async () => {
    const [push, stream] = pushStream<string>()

    const builder = createApp<{ log: string[] }>()
    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    const startPromise = builder.start({ log: [] })

    const id = appInstance.bind(stream, (app: any, val: string) => {
      app.state.log.push(val)
    })

    push("first")
    expect(appInstance.state.log).toEqual(["first"])

    // Unbind the stream
    const unbound = appInstance.unbind(id)
    expect(unbound).toBe(true)

    push("second")
    expect(appInstance.state.log).toEqual(["first"]) // Should not be modified

    appInstance.stop()
    await startPromise
  })

  it("should automatically cancel event stream subscriptions when app stops", async () => {
    let cancelCalled = false
    const stream = new EventStream<number>((listener) => {
      return {
        cancel() {
          cancelCalled = true
        }
      }
    })

    const builder = createApp<{ value: number }>()
    builder.bind(stream, (app, val) => {
      app.state.value = val
    })

    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    const startPromise = builder.start({ value: 0 })
    expect(cancelCalled).toBe(false)

    appInstance.stop()
    expect(cancelCalled).toBe(true)

    await startPromise
  })
})

describe("Potassium Triggers & Unbinding", () => {
  it("should bind and dispatch named triggers with payloads", async () => {
    const builder = createApp<{ lastEvent: string; payload: any }, {
      customEvent: { info: string }
      voidEvent: void
    }>()

    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    builder.bind("customEvent", (app, payload) => {
      app.state.lastEvent = "customEvent"
      app.state.payload = payload
    })

    builder.bind("voidEvent", (app) => {
      app.state.lastEvent = "voidEvent"
      app.state.payload = undefined
    })

    const startPromise = builder.start({ lastEvent: "none", payload: null })

    appInstance.trigger("customEvent", { info: "success" })
    expect(appInstance.state.lastEvent).toBe("customEvent")
    expect(appInstance.state.payload).toEqual({ info: "success" })

    appInstance.trigger("voidEvent")
    expect(appInstance.state.lastEvent).toBe("voidEvent")
    expect(appInstance.state.payload).toBeUndefined()

    appInstance.stop()
    await startPromise
  })

  it("should support unbinding trigger handlers", async () => {
    const builder = createApp<{ count: number }, { increment: void }>()
    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    const id = builder.bind("increment", (app) => {
      app.state.count++
    })

    const startPromise = builder.start({ count: 0 })

    appInstance.trigger("increment")
    expect(appInstance.state.count).toBe(1)

    // Unbind using the trigger name and symbol ID
    const unbound = appInstance.unbind("increment", id)
    expect(unbound).toBe(true)

    appInstance.trigger("increment")
    expect(appInstance.state.count).toBe(1) // count remains 1

    appInstance.stop()
    await startPromise
  })

  it("should return false when unbinding non-existent trigger handlers", async () => {
    const builder = createApp<{ count: number }, { event: void }>()
    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })
    const startPromise = builder.start({ count: 0 })

    const fakeId = Symbol("fake")
    const unbound = appInstance.unbind("event", fakeId)
    expect(unbound).toBe(false)

    const unboundEvent = appInstance.unbind(fakeId)
    expect(unboundEvent).toBe(false)

    appInstance.stop()
    await startPromise
  })
})

describe("Potassium onStop Hooks & Unbinding", () => {
  it("should execute registered onStop hooks and support unbinding them", async () => {
    const builder = createApp<{ stopped: boolean }>()
    let appInstance: any = null
    builder.onStart((app) => {
      appInstance = app
    })

    let stopCalled1 = false
    let stopCalled2 = false

    const id1 = builder.onStop(() => {
      stopCalled1 = true
    })

    const startPromise = builder.start({ stopped: false })

    const id2 = appInstance.onStop(() => {
      stopCalled2 = true
    })

    // Unbind the first onStop hook
    const unbound = appInstance.unbind(id1)
    expect(unbound).toBe(true)

    appInstance.stop()
    await startPromise

    expect(stopCalled1).toBe(false) // unbound, should not run
    expect(stopCalled2).toBe(true)  // registered at runtime, should run
  })
})
