import { createApp } from "../src"
import { EventStream } from "@bananaseed/event_stream"

type State = {
  lastInput: string,
  history: string[]
}

type Triggers = {
  log: string
  alert: string
  sayHi: void
}

const keyStream = EventStream.fromEventTarget<KeyboardEvent>(window, "keydown")

function main() {
  const builder = createApp<State,Triggers>()

  // Handle Triggers
  builder.bind("log", (_k, message) => {
    console.log(`[LOG]: ${message}`)
  })

  builder.bind("alert", (k, message) => {
    console.warn(`[ALERT]: ${message}`)
    k.state.history.push(`Alert: ${message}`)
  })
  builder.bind("sayHi", () => {
    console.log("hi")
  })

  // Bind keyboard input
  builder.bind(keyStream, (k, event) => {
    k.state.lastInput = event.key
    k.trigger("log", `Key pressed: ${event.key}`)

    k.trigger("sayHi")

    if (event.key === "Enter") {
      k.trigger("alert", "Enter key was pressed!")
    }
    
    if (event.key === "Escape") {
      k.stop()
    }
  })

  builder.onStart(() => {
    console.log("Triggers Example Started.")
    console.log("Press any key to log, Enter for alert, Escape to stop.")
  })

  builder.onStop(k => {
    console.log("Final state history:", k.state.history)
  })

  builder.start({ lastInput: "", history: [] })
}

main()
